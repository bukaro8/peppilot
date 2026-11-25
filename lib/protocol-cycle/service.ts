import "server-only";

import type { TransactionSql } from "postgres";

import {
  assertPrivateResourceAccess,
  type AuthenticatedActor,
  type PrivateResourceOperation,
} from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { revisionDateBounds } from "@/lib/protocol-cycle/revision-dates";
import { schedulesMatchTemplate } from "@/lib/member-protocol/service";
import { calculateAdministration, calculatePreparation } from "@/lib/approved-protocol/calculations";
import {
  validateProtocolTemplateContent,
  type ProtocolTemplateScheduleInput,
} from "@/lib/protocol-template/validation";

export type ProtocolCycleStatus = "active" | "paused" | "completed" | "cancelled";

export class ProtocolCycleError extends Error {
  constructor(
    message: string,
    readonly code: "conflict" | "invalid" | "not_found",
  ) {
    super(message);
    this.name = "ProtocolCycleError";
  }
}

type CycleRow = {
  approvedDefinition: unknown | null;
  createdAt: Date;
  endedOn: string | null;
  firstDeviatedOn: string | null;
  id: string;
  name: string;
  ownerUserId: string;
  plannedEndDate: string | null;
  durationType: "fixed_cycle" | "open_ended" | "as_needed";
  preparation: {
    concentrationMgPerMl?: string;
    diluentVolumeMl: string;
    ingredientProportions: string;
    syringeUnitsPerMl: string;
    vialStrengthMg: string;
  } | null;
  sourceProtocolId: string | null;
  sourceTemplateId: string | null;
  sourceTemplateName: string | null;
  sourceTemplateVersionId: string | null;
  sourceTemplateVersionNumber: number | null;
  startDate: string;
  status: ProtocolCycleStatus;
  templateInitiallyMatching: boolean;
  updatedAt: Date;
};

type PauseRow = {
  id: string;
  pausedOn: string;
  resumedOn: string | null;
};

type RevisionRow = {
  createdAt: Date;
  effectiveFrom: string;
  previousPlannedEndDate: string | null;
  id: string;
  revisionNumber: number;
  templateScheduleMatches: boolean;
};

type RevisionEntryRow = {
  catalogueEntryId: string;
  displayName: string;
  id: string;
  position: number;
};

type RevisionStepRow = ProtocolTemplateScheduleInput & {
  id: string;
  position: number;
  revisionEntryId: string;
};

export type CycleScheduleRangeSnapshot = {
  cycles: Array<{
    endedOn: string | null;
    id: string;
    name: string;
    plannedEndDate: string | null;
    durationType?: "fixed_cycle" | "open_ended" | "as_needed";
    startDate: string;
    status: "active" | "paused" | "completed";
  }>;
  pauses: Array<{
    cycleId: string;
    pausedOn: string;
    resumedOn: string | null;
  }>;
  revisions: Array<{
    cycleId: string;
    effectiveFrom: string;
    previousPlannedEndDate?: string | null;
    id: string;
    revisionNumber: number;
    steps: Array<ProtocolTemplateScheduleInput & {
      displayName: string;
      id: string;
    }>;
  }>;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function canonicalizeScheduleFrequencyFields(schedule: ProtocolTemplateScheduleInput): ProtocolTemplateScheduleInput {
  return {
    ...schedule,
    daysOfWeek: schedule.frequency === "weekly" ? schedule.daysOfWeek : [],
    intervalDays: schedule.frequency === "interval_days" ? schedule.intervalDays : null,
  };
}

function parseDate(value: string, label: string) {
  if (!isoDatePattern.test(value)) {
    throw new ProtocolCycleError(`${label} must use YYYY-MM-DD format.`, "invalid");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ProtocolCycleError(`${label} must be a valid date.`, "invalid");
  }
  return parsed;
}

function addDays(value: string, days: number) {
  const date = parseDate(value, "Start date");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function differenceInDays(start: string, end: string) {
  return Math.floor((parseDate(end, "Date").valueOf() - parseDate(start, "Date").valueOf()) / 86_400_000);
}

function cycleSelection() {
  return `
    cycle.id,
    cycle.owner_user_id as "ownerUserId",
    cycle.source_protocol_id as "sourceProtocolId",
    cycle.name,
    cycle.start_date::text as "startDate",
    cycle.planned_end_date::text as "plannedEndDate",
    cycle.duration_type as "durationType",
    cycle.approved_definition as "approvedDefinition",
    cycle.preparation,
    cycle.status,
    cycle.source_template_id as "sourceTemplateId",
    cycle.source_template_version_id as "sourceTemplateVersionId",
    cycle.template_initially_matching as "templateInitiallyMatching",
    cycle.first_deviated_on::text as "firstDeviatedOn",
    cycle.ended_on::text as "endedOn",
    cycle.created_at as "createdAt",
    cycle.updated_at as "updatedAt",
    source_version.name as "sourceTemplateName",
    source_version.version_number as "sourceTemplateVersionNumber"
  `;
}

async function assertCycleOwnership(
  sql: TransactionSql | ReturnType<typeof getPostgresClient>,
  actor: AuthenticatedActor,
  cycleId: string,
  operation: PrivateResourceOperation,
  lock = false,
) {
  const rows = lock
    ? await sql<{ ownerUserId: string }[]>`
        select owner_user_id as "ownerUserId"
        from protocol_cycle where id = ${cycleId} for update
      `
    : await sql<{ ownerUserId: string }[]>`
        select owner_user_id as "ownerUserId"
        from protocol_cycle where id = ${cycleId}
      `;
  if (!rows[0]) throw new ProtocolCycleError("Cycle not found.", "not_found");
  assertPrivateResourceAccess(actor, rows[0].ownerUserId, operation);
}

async function loadTemplateSourceInput(sql: TransactionSql, versionId: string) {
  const [version] = await sql<{ durationDays: number }[]>`
    select duration_days as "durationDays"
    from protocol_template_version where id = ${versionId} limit 1
  `;
  if (!version) return null;
  const steps = await sql<ProtocolTemplateScheduleInput[]>`
    select
      entry.catalogue_entry_id as "catalogueEntryId",
      step.days_of_week as "daysOfWeek",
      step.dose_amount::text as "doseAmount",
      step.dose_unit as "doseUnit",
      step.end_day as "endDay",
      step.frequency,
      step.interval_days as "intervalDays",
      step.start_day as "startDay",
      to_char(step.time_of_day, 'HH24:MI') as "timeOfDay"
    from protocol_template_schedule_step step
    join protocol_template_version_entry entry on entry.id = step.version_entry_id
    where entry.version_id = ${versionId}
    order by step.position
  `;
  return { durationDays: version.durationDays, steps };
}

async function insertRevisionContent(
  sql: TransactionSql,
  revisionId: string,
  schedules: ProtocolTemplateScheduleInput[],
) {
  const catalogueIds = [...new Set(schedules.map((schedule) => schedule.catalogueEntryId))];
  const entryIds = new Map<string, string>();

  for (const [index, catalogueEntryId] of catalogueIds.entries()) {
    const [catalogue] = await sql<{ id: string }[]>`
      select id from catalogue_entry
      where id = ${catalogueEntryId} and is_active = true
        and (owner_user_id is null or owner_user_id = (select cycle.owner_user_id from protocol_cycle cycle join protocol_cycle_schedule_revision revision on revision.cycle_id = cycle.id where revision.id = ${revisionId})) limit 1
    `;
    if (!catalogue) {
      throw new ProtocolCycleError(
        "Every schedule must use an active catalogue entry.",
        "invalid",
      );
    }
    const entryId = crypto.randomUUID();
    entryIds.set(catalogueEntryId, entryId);
    await sql`
      insert into protocol_cycle_schedule_entry (id, revision_id, catalogue_entry_id, position)
      values (${entryId}, ${revisionId}, ${catalogueEntryId}, ${index + 1})
    `;
  }

  for (const [index, schedule] of schedules.entries()) {
    const revisionEntryId = entryIds.get(schedule.catalogueEntryId);
    if (!revisionEntryId) {
      throw new ProtocolCycleError("Schedule catalogue entry was not linked.", "invalid");
    }
    await sql`
      insert into protocol_cycle_schedule_step (
        id, revision_entry_id, dose_amount, dose_unit, frequency, days_of_week,
        interval_days, time_of_day, times_of_day, administrations_per_day,
        dose_basis, ingredient_doses, route, start_day, end_day, position
      ) values (
        ${crypto.randomUUID()}, ${revisionEntryId}, ${schedule.doseAmount},
        ${schedule.doseUnit}, ${schedule.frequency}, ${schedule.daysOfWeek},
        ${schedule.intervalDays}, ${schedule.timeOfDay}, ${schedule.timesOfDay ?? []},
        ${schedule.administrationsPerDay ?? 1}, ${schedule.doseBasis ?? "single_compound_mass"},
        ${JSON.stringify(schedule.ingredientDoses ?? [])}::jsonb, ${schedule.route ?? null}, ${schedule.startDay},
        ${schedule.endDay}, ${index + 1}
      )
    `;
  }
}

async function loadRevisionDetail(revision: RevisionRow) {
  const sql = getPostgresClient();
  const entries = await sql<RevisionEntryRow[]>`
    select
      entry.id,
      entry.catalogue_entry_id as "catalogueEntryId",
      catalogue.display_name as "displayName",
      entry.position
    from protocol_cycle_schedule_entry entry
    join catalogue_entry catalogue on catalogue.id = entry.catalogue_entry_id
    where entry.revision_id = ${revision.id}
    order by entry.position
  `;
  const steps = await sql<RevisionStepRow[]>`
    select
      step.id,
      step.revision_entry_id as "revisionEntryId",
      entry.catalogue_entry_id as "catalogueEntryId",
      step.days_of_week as "daysOfWeek",
      step.dose_amount::text as "doseAmount",
      step.dose_unit as "doseUnit",
      step.end_day as "endDay",
      step.frequency,
      step.interval_days as "intervalDays",
      step.position,
      step.start_day as "startDay",
      to_char(step.time_of_day, 'HH24:MI') as "timeOfDay",
      step.times_of_day as "timesOfDay",
      step.administrations_per_day as "administrationsPerDay",
      step.dose_basis as "doseBasis", step.ingredient_doses as "ingredientDoses",
      step.route
    from protocol_cycle_schedule_step step
    join protocol_cycle_schedule_entry entry on entry.id = step.revision_entry_id
    where entry.revision_id = ${revision.id}
    order by step.position
  `;
  return { ...revision, entries, steps };
}

export async function startProtocolCycle(
  actor: AuthenticatedActor,
  input: {
    protocolId: string;
    startDate: string;
    preparation?: {
      diluentVolumeMl: string;
      ingredientProportions: string;
      syringeUnitsPerMl: string;
      vialStrengthMg: string;
    };
  },
) {
  parseDate(input.startDate, "Start date");
  const sql = getPostgresClient();
  const cycleId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();

  return sql.begin(async (transaction) => {
    const [protocol] = await transaction<{
      description: string | null;
      durationDays: number | null;
      durationType: "fixed_cycle" | "open_ended" | "as_needed";
      approvedDefinition: unknown | null;
      name: string;
      ownerUserId: string;
      sourceTemplateId: string | null;
      sourceTemplateVersionId: string | null;
      templateScheduleUnchanged: boolean;
    }[]>`
      select
        name, description, duration_days as "durationDays", duration_type as "durationType",
        approved_definition as "approvedDefinition",
        owner_user_id as "ownerUserId", source_template_id as "sourceTemplateId",
        source_template_version_id as "sourceTemplateVersionId",
        template_schedule_unchanged as "templateScheduleUnchanged"
      from member_protocol where id = ${input.protocolId} for update
    `;
    if (!protocol) throw new ProtocolCycleError("Saved protocol not found.", "not_found");
    assertPrivateResourceAccess(actor, protocol.ownerUserId, "create");

    const schedules = await transaction<ProtocolTemplateScheduleInput[]>`
      select
        entry.catalogue_entry_id as "catalogueEntryId",
        step.days_of_week as "daysOfWeek",
        step.dose_amount::text as "doseAmount",
        step.dose_unit as "doseUnit",
        step.end_day as "endDay",
        step.frequency,
        step.interval_days as "intervalDays",
        step.start_day as "startDay",
        to_char(step.time_of_day, 'HH24:MI') as "timeOfDay",
        step.times_of_day as "timesOfDay",
        step.administrations_per_day as "administrationsPerDay",
        step.dose_basis as "doseBasis", step.ingredient_doses as "ingredientDoses",
        step.route
      from member_protocol_schedule_step step
      join member_protocol_entry entry on entry.id = step.protocol_entry_id
      where entry.protocol_id = ${input.protocolId}
      order by step.position
    `;
    const canonicalSchedules = schedules.map(canonicalizeScheduleFrequencyFields);
    const validatedSchedules = protocol.durationType === "fixed_cycle"
      ? validateProtocolTemplateContent({ description: protocol.description, durationDays: protocol.durationDays ?? 0, name: protocol.name, schedules: canonicalSchedules })
      : { success: true as const, value: { schedules: canonicalSchedules } };
    if (!validatedSchedules.success) throw new ProtocolCycleError(validatedSchedules.error, "invalid");

    const plannedEndDate = protocol.durationDays === null ? null : addDays(input.startDate, protocol.durationDays - 1);
    const firstDeviatedOn =
      protocol.sourceTemplateVersionId && !protocol.templateScheduleUnchanged
        ? input.startDate
        : null;
    let preparation: CycleRow["preparation"] = input.preparation && Object.values(input.preparation).some(Boolean)
      ? { ...input.preparation }
      : null;
    if (preparation?.vialStrengthMg && preparation.diluentVolumeMl) {
      try {
        const calculated = calculatePreparation(preparation.vialStrengthMg, preparation.diluentVolumeMl);
        preparation = { ...preparation, ...calculated };
        if (preparation.syringeUnitsPerMl) {
          calculateAdministration("1", "mg", calculated.concentrationMgPerMl, preparation.syringeUnitsPerMl);
        }
      } catch {
        throw new ProtocolCycleError("Vial strength and diluent volume must be positive decimal values.", "invalid");
      }
    }
    await transaction`
      insert into protocol_cycle (
        id, owner_user_id, source_protocol_id, name, start_date, planned_end_date,
        duration_type, approved_definition, preparation,
        status, source_template_id, source_template_version_id,
        template_initially_matching, first_deviated_on
      ) values (
        ${cycleId}, ${actor.userId}, ${input.protocolId}, ${protocol.name},
        ${input.startDate}, ${plannedEndDate}, ${protocol.durationType}, ${protocol.approvedDefinition === null ? null : JSON.stringify(protocol.approvedDefinition)}::jsonb,
        ${preparation === null ? null : JSON.stringify(preparation)}::jsonb,
        'active', ${protocol.sourceTemplateId},
        ${protocol.sourceTemplateVersionId}, ${protocol.templateScheduleUnchanged},
        ${firstDeviatedOn}
      )
    `;
    await transaction`
      insert into protocol_cycle_schedule_revision (
        id, cycle_id, revision_number, effective_from, template_schedule_matches
      ) values (
        ${revisionId}, ${cycleId}, 1, ${input.startDate},
        ${protocol.templateScheduleUnchanged}
      )
    `;
    await insertRevisionContent(transaction, revisionId, validatedSchedules.value.schedules);
    return { cycleId, plannedEndDate };
  });
}

export async function getProtocolCycles(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  return sql<CycleRow[]>`
    select ${sql.unsafe(cycleSelection())}
    from protocol_cycle cycle
    left join protocol_template_version source_version
      on source_version.id = cycle.source_template_version_id
    where cycle.owner_user_id = ${actor.userId}
    order by cycle.created_at desc
  `;
}

export async function getProtocolCycle(actor: AuthenticatedActor, cycleId: string) {
  const sql = getPostgresClient();
  await assertCycleOwnership(sql, actor, cycleId, "read");
  const [cycle] = await sql<CycleRow[]>`
    select ${sql.unsafe(cycleSelection())}
    from protocol_cycle cycle
    left join protocol_template_version source_version
      on source_version.id = cycle.source_template_version_id
    where cycle.id = ${cycleId}
    limit 1
  `;
  if (!cycle) return null;
  const pauses = await sql<PauseRow[]>`
    select id, paused_on::text as "pausedOn", resumed_on::text as "resumedOn"
    from protocol_cycle_pause where cycle_id = ${cycleId}
    order by paused_on, created_at
  `;
  const revisionRows = await sql<RevisionRow[]>`
    select
      id, revision_number as "revisionNumber", effective_from::text as "effectiveFrom",
      previous_planned_end_date::text as "previousPlannedEndDate",
      template_schedule_matches as "templateScheduleMatches", created_at as "createdAt"
    from protocol_cycle_schedule_revision
    where cycle_id = ${cycleId}
    order by revision_number
  `;
  const revisions = [];
  for (const revision of revisionRows) revisions.push(await loadRevisionDetail(revision));
  return { ...cycle, pauses, revisions };
}

/**
 * Loads the immutable cycle schedule history needed to project a date range.
 * Ownership and active/paused filtering happen in every query so callers never
 * receive another member's private schedule data.
 */
export async function getCycleScheduleDataForRange(
  actor: AuthenticatedActor,
  startDate: string,
  endDate: string,
  options: { includeCompleted?: boolean } = {},
): Promise<CycleScheduleRangeSnapshot> {
  parseDate(startDate, "Range start");
  parseDate(endDate, "Range end");
  if (startDate > endDate) {
    throw new ProtocolCycleError("Range start must be on or before range end.", "invalid");
  }
  if (differenceInDays(startDate, endDate) > 62) {
    throw new ProtocolCycleError("Calendar ranges cannot exceed 63 days.", "invalid");
  }

  const sql = getPostgresClient();
  const includeCompleted = options.includeCompleted ?? false;
  const cycles = await sql<CycleScheduleRangeSnapshot["cycles"]>`
    select
      id, name, start_date::text as "startDate",
      planned_end_date::text as "plannedEndDate", duration_type as "durationType",
      ended_on::text as "endedOn", status
    from protocol_cycle
    where owner_user_id = ${actor.userId}
      and (status in ('active', 'paused') or (${includeCompleted} and status = 'completed'))
      and start_date <= ${endDate}
      and (planned_end_date is null or planned_end_date >= ${startDate})
    order by start_date, created_at
  `;

  if (cycles.length === 0) return { cycles: [], pauses: [], revisions: [] };

  const pauses = await sql<CycleScheduleRangeSnapshot["pauses"]>`
    select pause.cycle_id as "cycleId", pause.paused_on::text as "pausedOn",
      pause.resumed_on::text as "resumedOn"
    from protocol_cycle_pause pause
    join protocol_cycle cycle on cycle.id = pause.cycle_id
    where cycle.owner_user_id = ${actor.userId}
      and (cycle.status in ('active', 'paused') or (${includeCompleted} and cycle.status = 'completed'))
      and cycle.start_date <= ${endDate}
      and (cycle.planned_end_date is null or cycle.planned_end_date >= ${startDate})
    order by pause.paused_on, pause.created_at
  `;
  const revisionRows = await sql<Array<{
    cycleId: string;
    effectiveFrom: string;
    previousPlannedEndDate: string | null;
    id: string;
    revisionNumber: number;
  }>>`
    select revision.id, revision.cycle_id as "cycleId",
      revision.effective_from::text as "effectiveFrom",
      revision.previous_planned_end_date::text as "previousPlannedEndDate",
      revision.revision_number as "revisionNumber"
    from protocol_cycle_schedule_revision revision
    join protocol_cycle cycle on cycle.id = revision.cycle_id
    where cycle.owner_user_id = ${actor.userId}
      and (cycle.status in ('active', 'paused') or (${includeCompleted} and cycle.status = 'completed'))
      and cycle.start_date <= ${endDate}
      and (cycle.planned_end_date is null or cycle.planned_end_date >= ${startDate})
    order by revision.cycle_id, revision.revision_number
  `;
  const stepRows = await sql<Array<ProtocolTemplateScheduleInput & {
    displayName: string;
    id: string;
    revisionId: string;
  }>>`
    select step.id, revision.id as "revisionId",
      entry.catalogue_entry_id as "catalogueEntryId",
      catalogue.display_name as "displayName",
      step.days_of_week as "daysOfWeek", step.dose_amount::text as "doseAmount",
      step.dose_unit as "doseUnit", step.end_day as "endDay",
      step.frequency, step.interval_days as "intervalDays",
      step.start_day as "startDay", to_char(step.time_of_day, 'HH24:MI') as "timeOfDay",
      step.times_of_day as "timesOfDay",
      step.administrations_per_day as "administrationsPerDay",
      step.dose_basis as "doseBasis", step.ingredient_doses as "ingredientDoses",
      step.route
    from protocol_cycle_schedule_step step
    join protocol_cycle_schedule_entry entry on entry.id = step.revision_entry_id
    join protocol_cycle_schedule_revision revision on revision.id = entry.revision_id
    join protocol_cycle cycle on cycle.id = revision.cycle_id
    join catalogue_entry catalogue on catalogue.id = entry.catalogue_entry_id
    where cycle.owner_user_id = ${actor.userId}
      and (cycle.status in ('active', 'paused') or (${includeCompleted} and cycle.status = 'completed'))
      and cycle.start_date <= ${endDate}
      and (cycle.planned_end_date is null or cycle.planned_end_date >= ${startDate})
      and (revision.revision_number = 1 or revision.effective_from <= ${endDate})
    order by revision.cycle_id, revision.revision_number, step.position
  `;
  const stepsByRevision = new Map<string, CycleScheduleRangeSnapshot["revisions"][number]["steps"]>();
  for (const { revisionId, ...step } of stepRows) {
    const existing = stepsByRevision.get(revisionId) ?? [];
    existing.push(step);
    stepsByRevision.set(revisionId, existing);
  }

  return {
    cycles,
    pauses,
    revisions: revisionRows.map((revision) => ({
      ...revision,
      steps: stepsByRevision.get(revision.id) ?? [],
    })),
  };
}

async function lockedCycle(
  sql: TransactionSql,
  actor: AuthenticatedActor,
  cycleId: string,
  operation: PrivateResourceOperation,
) {
  await assertCycleOwnership(sql, actor, cycleId, operation, true);
  const [cycle] = await sql<CycleRow[]>`
    select ${sql.unsafe(cycleSelection())}
    from protocol_cycle cycle
    left join protocol_template_version source_version
      on source_version.id = cycle.source_template_version_id
    where cycle.id = ${cycleId}
  `;
  if (!cycle) throw new ProtocolCycleError("Cycle not found.", "not_found");
  return cycle;
}

function validateLifecycleDate(cycle: CycleRow, value: string, label: string) {
  parseDate(value, label);
  if (value < cycle.startDate) {
    throw new ProtocolCycleError(`${label} cannot be before the cycle start date.`, "invalid");
  }
}

export async function pauseProtocolCycle(
  actor: AuthenticatedActor,
  cycleId: string,
  pausedOn: string,
) {
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    const cycle = await lockedCycle(transaction, actor, cycleId, "update");
    if (cycle.status !== "active") {
      throw new ProtocolCycleError("Only an active cycle can be paused.", "conflict");
    }
    validateLifecycleDate(cycle, pausedOn, "Pause date");
    if (cycle.plannedEndDate && pausedOn > cycle.plannedEndDate) {
      throw new ProtocolCycleError("Pause date must be within the planned cycle.", "invalid");
    }
    const [lastPause] = await transaction<{ lastEventOn: string }[]>`
      select coalesce(resumed_on, paused_on)::text as "lastEventOn"
      from protocol_cycle_pause
      where cycle_id = ${cycleId}
      order by paused_on desc, created_at desc
      limit 1
    `;
    if (lastPause && pausedOn < lastPause.lastEventOn) {
      throw new ProtocolCycleError(
        "Pause date cannot precede the previous interruption event.",
        "invalid",
      );
    }
    await transaction`
      insert into protocol_cycle_pause (id, cycle_id, paused_on)
      values (${crypto.randomUUID()}, ${cycleId}, ${pausedOn})
    `;
    await transaction`
      update protocol_cycle set status = 'paused', updated_at = now() where id = ${cycleId}
    `;
  });
}

export async function resumeProtocolCycle(
  actor: AuthenticatedActor,
  cycleId: string,
  resumedOn: string,
) {
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    const cycle = await lockedCycle(transaction, actor, cycleId, "update");
    if (cycle.status !== "paused") {
      throw new ProtocolCycleError("Only a paused cycle can be resumed.", "conflict");
    }
    validateLifecycleDate(cycle, resumedOn, "Resume date");
    if (cycle.plannedEndDate && resumedOn > cycle.plannedEndDate) {
      throw new ProtocolCycleError("Resume date must be within the planned cycle.", "invalid");
    }
    const [openPause] = await transaction<{ id: string; pausedOn: string }[]>`
      select id, paused_on::text as "pausedOn"
      from protocol_cycle_pause
      where cycle_id = ${cycleId} and resumed_on is null
      order by paused_on desc limit 1
    `;
    if (!openPause || resumedOn < openPause.pausedOn) {
      throw new ProtocolCycleError("Resume date cannot be before the pause date.", "invalid");
    }
    await transaction`
      update protocol_cycle_pause set resumed_on = ${resumedOn} where id = ${openPause.id}
    `;
    await transaction`
      update protocol_cycle set status = 'active', updated_at = now() where id = ${cycleId}
    `;
  });
}

export async function endProtocolCycle(
  actor: AuthenticatedActor,
  cycleId: string,
  status: "completed" | "cancelled",
  endedOn: string,
) {
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    const cycle = await lockedCycle(transaction, actor, cycleId, "update");
    if (cycle.status !== "active" && cycle.status !== "paused") {
      throw new ProtocolCycleError("This cycle has already ended.", "conflict");
    }
    validateLifecycleDate(cycle, endedOn, "End date");
    const [latestRevision] = await transaction<{ effectiveFrom: string }[]>`
      select effective_from::text as "effectiveFrom"
      from protocol_cycle_schedule_revision
      where cycle_id = ${cycleId}
      order by revision_number desc limit 1
    `;
    if (latestRevision && endedOn < latestRevision.effectiveFrom) {
      throw new ProtocolCycleError(
        "End date cannot precede the latest schedule revision.",
        "invalid",
      );
    }
    const [lastPause] = await transaction<{ lastEventOn: string }[]>`
      select coalesce(resumed_on, paused_on)::text as "lastEventOn"
      from protocol_cycle_pause
      where cycle_id = ${cycleId}
      order by paused_on desc, created_at desc
      limit 1
    `;
    if (lastPause && endedOn < lastPause.lastEventOn) {
      throw new ProtocolCycleError(
        "End date cannot precede the latest interruption event.",
        "invalid",
      );
    }
    await transaction`
      update protocol_cycle
      set status = ${status}, ended_on = ${endedOn}, updated_at = now()
      where id = ${cycleId}
    `;
  });
}

export async function reviseProtocolCycleSchedule(
  actor: AuthenticatedActor,
  cycleId: string,
  effectiveFrom: string,
  schedules: ProtocolTemplateScheduleInput[],
  options: { makeOngoing?: boolean } = {},
) {
  parseDate(effectiveFrom, "Effective date");
  const sql = getPostgresClient();
  return sql.begin(async (transaction) => {
    const cycle = await lockedCycle(transaction, actor, cycleId, "update");
    if (cycle.status !== "active") {
      throw new ProtocolCycleError(
        "Schedule revisions require an active cycle.",
        "conflict",
      );
    }
    const convertingToOngoing = options.makeOngoing === true && cycle.plannedEndDate !== null;
    const plannedEndDate = convertingToOngoing ? null : cycle.plannedEndDate;
    if (effectiveFrom < cycle.startDate || (plannedEndDate && effectiveFrom > plannedEndDate)) {
      throw new ProtocolCycleError(
        "Effective date must be within the planned cycle.",
        "invalid",
      );
    }
    if (convertingToOngoing) {
      schedules = schedules.map((schedule) => ({ ...schedule, endDay: schedules.some((other) => other.catalogueEntryId === schedule.catalogueEntryId && other.startDay > schedule.startDay) ? schedule.endDay : null }));
    }
    const durationDays = plannedEndDate
      ? differenceInDays(cycle.startDate, plannedEndDate) + 1
      : 3650;
    const submittedEndDays = schedules.map((schedule) => schedule.endDay);
    const validation = validateProtocolTemplateContent({
      description: null,
      durationDays,
      name: cycle.name,
      schedules: schedules.map((schedule) => ({
        ...schedule,
        endDay: schedule.endDay ?? durationDays,
      })),
    });
    if (!validation.success) throw new ProtocolCycleError(validation.error, "invalid");
    validation.value.schedules = validation.value.schedules.map((schedule, index) => ({
      ...schedule,
      endDay: submittedEndDays[index],
    }));

    const [latest] = await transaction<{
      effectiveFrom: string;
      id: string;
      revisionNumber: number;
    }[]>`
      select id, revision_number as "revisionNumber", effective_from::text as "effectiveFrom"
      from protocol_cycle_schedule_revision
      where cycle_id = ${cycleId}
      order by revision_number desc limit 1
      for update
    `;
    if (!latest) {
      throw new ProtocolCycleError(
        "A revision must take effect after the current revision.",
        "invalid",
      );
    }
    const [lastPause] = await transaction<{ lastEventOn: string }[]>`
      select coalesce(resumed_on, paused_on)::text as "lastEventOn"
      from protocol_cycle_pause
      where cycle_id = ${cycleId}
      order by paused_on desc, created_at desc
      limit 1
    `;
    const bounds = revisionDateBounds({ startDate: cycle.startDate, plannedEndDate, latestEffectiveFrom: latest.effectiveFrom, lastInterruptionDate: lastPause?.lastEventOn });
    if (!bounds.available) throw new ProtocolCycleError("No revision dates remain before this cycle's planned end. Start a new independent cycle for a later schedule.", "invalid");
    if (effectiveFrom < bounds.minimumDate) {
      throw new ProtocolCycleError(
        `Effective date must be ${bounds.minimumDate} or later, after the latest revision and interruption.`,
        "invalid",
      );
    }
    const currentSteps = await transaction<ProtocolTemplateScheduleInput[]>`
      select
        entry.catalogue_entry_id as "catalogueEntryId",
        step.days_of_week as "daysOfWeek",
        step.dose_amount::text as "doseAmount",
        step.dose_unit as "doseUnit",
        step.end_day as "endDay",
        step.frequency,
        step.interval_days as "intervalDays",
        step.start_day as "startDay",
        to_char(step.time_of_day, 'HH24:MI') as "timeOfDay",
        step.times_of_day as "timesOfDay",
        step.administrations_per_day as "administrationsPerDay",
        step.dose_basis as "doseBasis", step.ingredient_doses as "ingredientDoses",
        step.route
      from protocol_cycle_schedule_step step
      join protocol_cycle_schedule_entry entry on entry.id = step.revision_entry_id
      where entry.revision_id = ${latest.id}
      order by step.position
    `;
    if (
      !convertingToOngoing && schedulesMatchTemplate(validation.value, {
        durationDays,
        steps: currentSteps,
      })
    ) {
      throw new ProtocolCycleError("Change the schedule before creating a revision.", "conflict");
    }

    let templateScheduleMatches = false;
    if (cycle.sourceTemplateVersionId && !convertingToOngoing) {
      const source = await loadTemplateSourceInput(transaction, cycle.sourceTemplateVersionId);
      templateScheduleMatches = source
        ? schedulesMatchTemplate(validation.value, source)
        : false;
    }
    const revisionId = crypto.randomUUID();
    const revisionNumber = latest.revisionNumber + 1;
    await transaction`
      insert into protocol_cycle_schedule_revision (
        id, cycle_id, revision_number, effective_from, template_schedule_matches, previous_planned_end_date
      ) values (
        ${revisionId}, ${cycleId}, ${revisionNumber}, ${effectiveFrom},
        ${templateScheduleMatches}, ${convertingToOngoing ? cycle.plannedEndDate : null}
      )
    `;
    await insertRevisionContent(transaction, revisionId, validation.value.schedules);
    if (convertingToOngoing) await transaction`update protocol_cycle set duration_type = 'open_ended', planned_end_date = null where id = ${cycleId}`;
    if (cycle.sourceTemplateVersionId && !templateScheduleMatches) {
      await transaction`
        update protocol_cycle
        set first_deviated_on = coalesce(first_deviated_on, ${effectiveFrom}),
            updated_at = now()
        where id = ${cycleId}
      `;
    } else {
      await transaction`
        update protocol_cycle set updated_at = now() where id = ${cycleId}
      `;
    }
    return { revisionId, revisionNumber, templateScheduleMatches };
  });
}

export function completeMatchingWeeksBeforeDeviation(cycle: {
  firstDeviatedOn: string | null;
  sourceTemplateVersionId: string | null;
  startDate: string;
  templateInitiallyMatching: boolean;
}) {
  if (!cycle.sourceTemplateVersionId || !cycle.templateInitiallyMatching) return 0;
  if (!cycle.firstDeviatedOn) return null;
  return Math.max(0, Math.floor(differenceInDays(cycle.startDate, cycle.firstDeviatedOn) / 7));
}
