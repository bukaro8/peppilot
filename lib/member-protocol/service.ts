import "server-only";

import type { TransactionSql } from "postgres";

import {
  assertPrivateResourceAccess,
  type AuthenticatedActor,
  type PrivateResourceOperation,
} from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import {
  getPublishedProtocolTemplateVersionById,
} from "@/lib/protocol-template/service";
import {
  validateProtocolTemplateContent,
  type ProtocolTemplateInput,
  type ProtocolTemplateScheduleInput,
} from "@/lib/protocol-template/validation";

export type MemberProtocolOrigin = "approved_preset" | "custom" | "template";

export class MemberProtocolError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "not_found",
  ) {
    super(message);
    this.name = "MemberProtocolError";
  }
}

type ProtocolRow = {
  createdAt: Date;
  description: string | null;
  durationDays: number | null;
  durationType: "fixed_cycle" | "open_ended" | "as_needed";
  id: string;
  name: string;
  origin: MemberProtocolOrigin;
  ownerUserId: string;
  sourceTemplateId: string | null;
  sourceTemplateName: string | null;
  sourceTemplateVersionId: string | null;
  sourceTemplateVersionNumber: number | null;
  sourceApprovedPresetId: string | null;
  status: "draft";
  templateScheduleUnchanged: boolean;
  updatedAt: Date;
};

type ProtocolEntryRow = {
  catalogueEntryId: string;
  catalogueSlug: string;
  displayName: string;
  id: string;
  position: number;
};

type ProtocolScheduleRow = {
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseUnit: string;
  endDay: number | null;
  frequency: "as_needed" | "daily" | "weekly" | "interval_days";
  id: string;
  intervalDays: number | null;
  position: number;
  protocolEntryId: string;
  startDay: number;
  timeOfDay: string | null;
  timesOfDay: string[];
  administrationsPerDay: number;
  doseBasis: string;
  ingredientDoses: unknown[];
  route: string | null;
};

function protocolSelection() {
  return `
    protocol.id,
    protocol.owner_user_id as "ownerUserId",
    protocol.name,
    protocol.description,
    protocol.duration_days as "durationDays",
    protocol.duration_type as "durationType",
    protocol.origin,
    protocol.source_template_id as "sourceTemplateId",
    protocol.source_template_version_id as "sourceTemplateVersionId",
    protocol.source_approved_preset_id as "sourceApprovedPresetId",
    protocol.template_schedule_unchanged as "templateScheduleUnchanged",
    protocol.status,
    protocol.created_at as "createdAt",
    protocol.updated_at as "updatedAt",
    source_version.name as "sourceTemplateName",
    source_version.version_number as "sourceTemplateVersionNumber"
  `;
}

async function assertProtocolOwnership(
  sql: TransactionSql | ReturnType<typeof getPostgresClient>,
  actor: AuthenticatedActor,
  protocolId: string,
  operation: PrivateResourceOperation,
  lock = false,
) {
  const rows = lock
    ? await sql<{ ownerUserId: string }[]>`
        select owner_user_id as "ownerUserId"
        from member_protocol where id = ${protocolId} for update
      `
    : await sql<{ ownerUserId: string }[]>`
        select owner_user_id as "ownerUserId"
        from member_protocol where id = ${protocolId}
      `;
  if (!rows[0]) throw new MemberProtocolError("Protocol not found.", "not_found");
  assertPrivateResourceAccess(actor, rows[0].ownerUserId, operation);
}

async function loadProtocolDetail(protocolId: string) {
  const sql = getPostgresClient();
  const [protocol] = await sql<ProtocolRow[]>`
    select ${sql.unsafe(protocolSelection())}
    from member_protocol protocol
    left join protocol_template_version source_version
      on source_version.id = protocol.source_template_version_id
    where protocol.id = ${protocolId}
    limit 1
  `;
  if (!protocol) return null;

  const entries = await sql<ProtocolEntryRow[]>`
    select
      entry.id,
      entry.catalogue_entry_id as "catalogueEntryId",
      catalogue.slug as "catalogueSlug",
      catalogue.display_name as "displayName",
      entry.position
    from member_protocol_entry entry
    join catalogue_entry catalogue on catalogue.id = entry.catalogue_entry_id
    where entry.protocol_id = ${protocolId}
    order by entry.position
  `;
  const steps = await sql<ProtocolScheduleRow[]>`
    select
      step.id,
      step.protocol_entry_id as "protocolEntryId",
      entry.catalogue_entry_id as "catalogueEntryId",
      step.dose_amount::text as "doseAmount",
      step.dose_unit as "doseUnit",
      step.frequency,
      step.days_of_week as "daysOfWeek",
      step.interval_days as "intervalDays",
      to_char(step.time_of_day, 'HH24:MI') as "timeOfDay",
      step.times_of_day as "timesOfDay",
      step.administrations_per_day as "administrationsPerDay",
      step.dose_basis as "doseBasis",
      step.ingredient_doses as "ingredientDoses",
      step.route,
      step.start_day as "startDay",
      step.end_day as "endDay",
      step.position
    from member_protocol_schedule_step step
    join member_protocol_entry entry on entry.id = step.protocol_entry_id
    where entry.protocol_id = ${protocolId}
    order by step.position
  `;

  return { ...protocol, entries, steps };
}

async function insertProtocolContent(
  sql: TransactionSql,
  protocolId: string,
  schedules: ProtocolTemplateScheduleInput[],
) {
  const catalogueIds = [...new Set(schedules.map((schedule) => schedule.catalogueEntryId))];
  const entryIds = new Map<string, string>();

  for (const [index, catalogueEntryId] of catalogueIds.entries()) {
    const catalogueRows = await sql<{ id: string }[]>`
      select id from catalogue_entry
      where id = ${catalogueEntryId} and is_active = true
      limit 1
    `;
    if (!catalogueRows[0]) {
      throw new MemberProtocolError(
        "Every schedule must use an active catalogue entry.",
        "invalid",
      );
    }

    const entryId = crypto.randomUUID();
    entryIds.set(catalogueEntryId, entryId);
    await sql`
      insert into member_protocol_entry (id, protocol_id, catalogue_entry_id, position)
      values (${entryId}, ${protocolId}, ${catalogueEntryId}, ${index + 1})
    `;
  }

  for (const [index, schedule] of schedules.entries()) {
    const protocolEntryId = entryIds.get(schedule.catalogueEntryId);
    if (!protocolEntryId) {
      throw new MemberProtocolError("Schedule catalogue entry was not linked.", "invalid");
    }
    await sql`
      insert into member_protocol_schedule_step (
        id, protocol_entry_id, dose_amount, dose_unit, frequency, days_of_week,
        interval_days, time_of_day, start_day, end_day, position
      ) values (
        ${crypto.randomUUID()}, ${protocolEntryId}, ${schedule.doseAmount},
        ${schedule.doseUnit}, ${schedule.frequency}, ${schedule.daysOfWeek},
        ${schedule.intervalDays}, ${schedule.timeOfDay}, ${schedule.startDay},
        ${schedule.endDay}, ${index + 1}
      )
    `;
  }
}

function scheduleFingerprint(schedule: ProtocolTemplateScheduleInput) {
  return JSON.stringify({
    catalogueEntryId: schedule.catalogueEntryId,
    daysOfWeek: [...schedule.daysOfWeek].sort((left, right) => left - right),
    doseAmount: Number(schedule.doseAmount).toString(),
    doseUnit: schedule.doseUnit,
    endDay: schedule.endDay,
    frequency: schedule.frequency,
    intervalDays: schedule.intervalDays,
    startDay: schedule.startDay,
    timeOfDay: schedule.timeOfDay,
    administrationsPerDay: schedule.administrationsPerDay ?? 1,
    doseBasis: schedule.doseBasis ?? "single_compound_mass",
    ingredientDoses: schedule.ingredientDoses ?? [],
    route: schedule.route ?? null,
    timesOfDay: schedule.timesOfDay ?? [],
  });
}

export function schedulesMatchTemplate(
  input: ProtocolTemplateInput,
  source: { durationDays: number; steps: ProtocolTemplateScheduleInput[] },
) {
  if (input.durationDays !== source.durationDays || input.schedules.length !== source.steps.length) {
    return false;
  }
  const current = input.schedules.map(scheduleFingerprint).sort();
  const original = source.steps.map(scheduleFingerprint).sort();
  return current.every((value, index) => value === original[index]);
}

function templateInputFromSnapshot(
  snapshot: Awaited<ReturnType<typeof getPublishedProtocolTemplateVersionById>>,
) {
  if (!snapshot) return null;
  return {
    durationDays: snapshot.durationDays,
    steps: snapshot.steps.map((step) => ({
      catalogueEntryId: step.catalogueEntryId,
      daysOfWeek: step.daysOfWeek,
      doseAmount: step.doseAmount,
      doseUnit: step.doseUnit,
      endDay: step.endDay,
      frequency: step.frequency,
      intervalDays: step.intervalDays,
      startDay: step.startDay,
      timeOfDay: step.timeOfDay,
    })),
  };
}

async function loadTemplateSourceInput(sql: TransactionSql, versionId: string) {
  const [version] = await sql<{ durationDays: number }[]>`
    select duration_days as "durationDays"
    from protocol_template_version
    where id = ${versionId}
    limit 1
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

async function createProtocol(
  actor: AuthenticatedActor,
  input: ProtocolTemplateInput,
  source: Awaited<ReturnType<typeof getPublishedProtocolTemplateVersionById>> | null,
) {
  const validation = validateProtocolTemplateContent(input);
  if (!validation.success) throw new MemberProtocolError(validation.error, "invalid");

  const protocolId = crypto.randomUUID();
  const sourceInput = templateInputFromSnapshot(source);
  const unchanged = sourceInput
    ? schedulesMatchTemplate(validation.value, sourceInput)
    : false;
  const sql = getPostgresClient();

  await sql.begin(async (transaction) => {
    await transaction`
      insert into member_protocol (
        id, owner_user_id, name, description, duration_days, origin,
        source_template_id, source_template_version_id, template_schedule_unchanged
      ) values (
        ${protocolId}, ${actor.userId}, ${validation.value.name},
        ${validation.value.description}, ${validation.value.durationDays},
        ${source ? "template" : "custom"}, ${source?.templateId ?? null},
        ${source?.id ?? null}, ${unchanged}
      )
    `;
    await insertProtocolContent(transaction, protocolId, validation.value.schedules);
  });

  return { protocolId, templateScheduleUnchanged: unchanged };
}

export async function createMemberProtocol(
  actor: AuthenticatedActor,
  input: ProtocolTemplateInput,
) {
  return createProtocol(actor, input, null);
}

export async function copyPublishedTemplateToProtocol(
  actor: AuthenticatedActor,
  sourceVersionId: string,
  input: ProtocolTemplateInput,
) {
  const source = await getPublishedProtocolTemplateVersionById(sourceVersionId);
  if (!source) {
    throw new MemberProtocolError("Published template version not found.", "not_found");
  }
  return createProtocol(actor, input, source);
}

export async function getMemberProtocols(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  return sql<ProtocolRow[]>`
    select ${sql.unsafe(protocolSelection())}
    from member_protocol protocol
    left join protocol_template_version source_version
      on source_version.id = protocol.source_template_version_id
    where protocol.owner_user_id = ${actor.userId}
    order by protocol.updated_at desc
  `;
}

export async function getMemberProtocol(actor: AuthenticatedActor, protocolId: string) {
  const sql = getPostgresClient();
  await assertProtocolOwnership(sql, actor, protocolId, "read");
  return loadProtocolDetail(protocolId);
}

export async function updateMemberProtocol(
  actor: AuthenticatedActor,
  protocolId: string,
  input: ProtocolTemplateInput,
) {
  const validation = validateProtocolTemplateContent(input);
  if (!validation.success) throw new MemberProtocolError(validation.error, "invalid");
  const sql = getPostgresClient();

  await sql.begin(async (transaction) => {
    await assertProtocolOwnership(transaction, actor, protocolId, "update", true);
    const [protocol] = await transaction<{
      origin: MemberProtocolOrigin;
      sourceTemplateVersionId: string | null;
    }[]>`
      select origin, source_template_version_id as "sourceTemplateVersionId"
      from member_protocol where id = ${protocolId}
    `;
    if (!protocol) throw new MemberProtocolError("Protocol not found.", "not_found");

    let unchanged = false;
    if (protocol.origin === "template" && protocol.sourceTemplateVersionId) {
      const sourceInput = await loadTemplateSourceInput(
        transaction,
        protocol.sourceTemplateVersionId,
      );
      unchanged = sourceInput
        ? schedulesMatchTemplate(validation.value, sourceInput)
        : false;
    }

    await transaction`
      update member_protocol
      set name = ${validation.value.name}, description = ${validation.value.description},
          duration_days = ${validation.value.durationDays},
          template_schedule_unchanged = ${unchanged}, updated_at = now()
      where id = ${protocolId}
    `;
    await transaction`delete from member_protocol_entry where protocol_id = ${protocolId}`;
    await insertProtocolContent(transaction, protocolId, validation.value.schedules);
  });
}

export async function deleteMemberProtocol(actor: AuthenticatedActor, protocolId: string) {
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    await assertProtocolOwnership(transaction, actor, protocolId, "delete", true);
    await transaction`delete from member_protocol where id = ${protocolId} and status = 'draft'`;
  });
}
