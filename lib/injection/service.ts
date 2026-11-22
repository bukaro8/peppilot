import "server-only";

import type { TransactionSql } from "postgres";

import {
  assertPrivateResourceAccess,
  type AuthenticatedActor,
  type PrivateResourceOperation,
} from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { isInjectionSiteId, type InjectionSiteId } from "@/lib/injection/sites";
import {
  addCalendarDays,
  calendarDayDifference,
  getDailySchedule,
  getScheduledEvents,
  parseCalendarDate,
  type ScheduledProtocolEvent,
} from "@/lib/protocol-calendar/service";
import { getProtocolCycle } from "@/lib/protocol-cycle/service";

export type InjectionStatus = "completed" | "skipped" | "missed";

export type InjectionRecordInput = {
  actualDate?: string | null;
  actualDoseAmount?: string | null;
  actualDoseUnit?: string | null;
  actualTime?: string | null;
  actualVolumeMl?: string | null;
  injectionSiteId?: InjectionSiteId | "" | null;
  notes?: string | null;
  status: InjectionStatus;
};

export class InjectionRecordError extends Error {
  constructor(
    message: string,
    readonly code: "conflict" | "invalid" | "not_found",
  ) {
    super(message);
    this.name = "InjectionRecordError";
  }
}

export type InjectionRecordRow = {
  actualDate: string | null;
  actualDoseAmount: string | null;
  actualDoseUnit: string | null;
  actualTime: string | null;
  actualVolumeMl: string | null;
  catalogueEntryId: string;
  createdAt: Date;
  cycleId: string;
  cycleName: string;
  id: string;
  injectionSiteId: InjectionSiteId | null;
  notes: string | null;
  ownerUserId: string;
  peptideName: string;
  scheduleRevisionId: string;
  scheduleStepId: string;
  scheduledDate: string;
  scheduledDoseAmount: string;
  scheduledDoseUnit: string;
  scheduledOccurrenceId: string;
  scheduledTime: string | null;
  status: InjectionStatus;
  updatedAt: Date;
};

export type InjectionHistoryFilters = {
  cycleId?: string;
  dateFrom?: string;
  dateTo?: string;
  injectionSiteId?: InjectionSiteId;
  page?: number;
  pageSize?: number;
  peptideId?: string;
  query?: string;
  sort?: "asc" | "desc";
  status?: InjectionStatus;
};

export type InjectionHistoryResult = {
  filters: InjectionHistoryFilters;
  page: number;
  pageCount: number;
  pageSize: number;
  records: InjectionRecordRow[];
  total: number;
};

const statuses = new Set<InjectionStatus>(["completed", "skipped", "missed"]);
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function recordSelection() {
  return `
    record.id,
    record.owner_user_id as "ownerUserId",
    record.cycle_id as "cycleId",
    cycle.name as "cycleName",
    record.scheduled_occurrence_id as "scheduledOccurrenceId",
    record.schedule_revision_id as "scheduleRevisionId",
    record.schedule_step_id as "scheduleStepId",
    record.catalogue_entry_id as "catalogueEntryId",
    catalogue.display_name as "peptideName",
    record.scheduled_date::text as "scheduledDate",
    to_char(record.scheduled_time, 'HH24:MI') as "scheduledTime",
    record.scheduled_dose_amount::text as "scheduledDoseAmount",
    record.scheduled_dose_unit as "scheduledDoseUnit",
    record.status,
    record.actual_date::text as "actualDate",
    to_char(record.actual_time, 'HH24:MI') as "actualTime",
    record.actual_dose_amount::text as "actualDoseAmount",
    record.actual_dose_unit as "actualDoseUnit",
    record.actual_volume_ml::text as "actualVolumeMl",
    record.injection_site_id as "injectionSiteId",
    record.notes,
    record.created_at as "createdAt",
    record.updated_at as "updatedAt"
  `;
}

function normalizeInput(input: InjectionRecordInput) {
  if (!statuses.has(input.status)) {
    throw new InjectionRecordError("Choose a valid injection status.", "invalid");
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 1000) {
    throw new InjectionRecordError("Notes must be 1,000 characters or fewer.", "invalid");
  }
  if (input.status !== "completed") {
    return {
      actualDate: null,
      actualDoseAmount: null,
      actualDoseUnit: null,
      actualTime: null,
      actualVolumeMl: null,
      injectionSiteId: null,
      notes,
      status: input.status,
    };
  }

  const actualDate = input.actualDate?.trim() ?? "";
  const actualTime = input.actualTime?.trim() ?? "";
  const actualDoseAmount = input.actualDoseAmount?.trim() ?? "";
  const actualDoseUnit = input.actualDoseUnit?.trim() ?? "";
  const actualVolumeMl = input.actualVolumeMl?.trim() || null;
  const injectionSiteId = input.injectionSiteId?.trim() || null;
  try {
    parseCalendarDate(actualDate);
  } catch {
    throw new InjectionRecordError("Actual date must be valid.", "invalid");
  }
  if (!timePattern.test(actualTime)) {
    throw new InjectionRecordError("Actual time must use a valid 24-hour time.", "invalid");
  }
  if (!actualDoseAmount || !Number.isFinite(Number(actualDoseAmount)) || Number(actualDoseAmount) <= 0) {
    throw new InjectionRecordError("Actual dose must be greater than zero.", "invalid");
  }
  if (actualDoseUnit.length < 1 || actualDoseUnit.length > 20) {
    throw new InjectionRecordError("Actual dose unit must be 1 to 20 characters.", "invalid");
  }
  if (actualVolumeMl !== null && (!Number.isFinite(Number(actualVolumeMl)) || Number(actualVolumeMl) <= 0)) {
    throw new InjectionRecordError("Injection volume must be greater than zero.", "invalid");
  }
  if (injectionSiteId && !isInjectionSiteId(injectionSiteId)) {
    throw new InjectionRecordError("Choose a valid injection site.", "invalid");
  }
  return {
    actualDate,
    actualDoseAmount,
    actualDoseUnit,
    actualTime,
    actualVolumeMl,
    injectionSiteId,
    notes,
    status: input.status,
  };
}

function occurrenceDate(occurrenceId: string) {
  const match = occurrenceId.match(/:(\d{4}-\d{2}-\d{2})$/);
  if (!match) throw new InjectionRecordError("Scheduled occurrence is invalid.", "invalid");
  return match[1];
}

export async function getScheduledOccurrence(
  actor: AuthenticatedActor,
  scheduledOccurrenceId: string,
) {
  const events = await getDailySchedule(actor, occurrenceDate(scheduledOccurrenceId));
  const event = events.find((candidate) => candidate.id === scheduledOccurrenceId);
  if (!event) throw new InjectionRecordError("Scheduled occurrence not found.", "not_found");
  return event;
}

async function assertRecordOwnership(
  sql: TransactionSql | ReturnType<typeof getPostgresClient>,
  actor: AuthenticatedActor,
  recordId: string,
  operation: PrivateResourceOperation,
  lock = false,
) {
  const rows = lock
    ? await sql<{ ownerUserId: string }[]>`
        select owner_user_id as "ownerUserId" from injection_record where id = ${recordId} for update
      `
    : await sql<{ ownerUserId: string }[]>`
        select owner_user_id as "ownerUserId" from injection_record where id = ${recordId}
      `;
  if (!rows[0]) throw new InjectionRecordError("Injection record not found.", "not_found");
  assertPrivateResourceAccess(actor, rows[0].ownerUserId, operation);
}

export async function createInjectionRecord(
  actor: AuthenticatedActor,
  scheduledOccurrenceId: string,
  input: InjectionRecordInput,
) {
  const event = await getScheduledOccurrence(actor, scheduledOccurrenceId);
  const value = normalizeInput(input);
  const sql = getPostgresClient();
  const recordId = crypto.randomUUID();
  try {
    await sql`
      insert into injection_record (
        id, owner_user_id, cycle_id, scheduled_occurrence_id, schedule_revision_id,
        schedule_step_id, catalogue_entry_id, scheduled_date, scheduled_time,
        scheduled_dose_amount, scheduled_dose_unit, status, actual_date, actual_time,
        actual_dose_amount, actual_dose_unit, actual_volume_ml, injection_site_id, notes
      ) values (
        ${recordId}, ${actor.userId}, ${event.cycleId}, ${event.id}, ${event.revisionId},
        ${event.scheduleStepId}, ${event.catalogueEntryId}, ${event.date}, ${event.timeOfDay},
        ${event.doseAmount}, ${event.doseUnit}, ${value.status}, ${value.actualDate},
        ${value.actualTime}, ${value.actualDoseAmount}, ${value.actualDoseUnit}, ${value.actualVolumeMl},
        ${value.injectionSiteId}, ${value.notes}
      )
    `;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new InjectionRecordError("This scheduled injection has already been recorded.", "conflict");
    }
    throw error;
  }
  return { recordId };
}

export async function getInjectionRecord(actor: AuthenticatedActor, recordId: string) {
  const sql = getPostgresClient();
  await assertRecordOwnership(sql, actor, recordId, "read");
  const [record] = await sql<InjectionRecordRow[]>`
    select ${sql.unsafe(recordSelection())}
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.id = ${recordId}
  `;
  return record ?? null;
}

export async function getInjectionRecordForOccurrence(
  actor: AuthenticatedActor,
  scheduledOccurrenceId: string,
) {
  const sql = getPostgresClient();
  const [record] = await sql<InjectionRecordRow[]>`
    select ${sql.unsafe(recordSelection())}
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId}
      and record.scheduled_occurrence_id = ${scheduledOccurrenceId}
    limit 1
  `;
  return record ?? null;
}

export async function updateInjectionRecord(
  actor: AuthenticatedActor,
  recordId: string,
  input: InjectionRecordInput,
) {
  const value = normalizeInput(input);
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    await assertRecordOwnership(transaction, actor, recordId, "update", true);
    const [current] = await transaction<{
      actualDate: string | null;
      actualDoseAmount: string | null;
      actualDoseUnit: string | null;
      actualTime: string | null;
      actualVolumeMl: string | null;
      injectionSiteId: InjectionSiteId | null;
      notes: string | null;
      status: InjectionStatus;
    }[]>`
      select status, actual_date::text as "actualDate",
        to_char(actual_time, 'HH24:MI') as "actualTime",
        actual_dose_amount::text as "actualDoseAmount",
        actual_dose_unit as "actualDoseUnit", actual_volume_ml::text as "actualVolumeMl",
        injection_site_id as "injectionSiteId", notes
      from injection_record where id = ${recordId}
    `;
    if (!current) throw new InjectionRecordError("Injection record not found.", "not_found");
    await transaction`
      insert into injection_record_history (
        id, injection_record_id, previous_status, previous_actual_date,
        previous_actual_time, previous_actual_dose_amount, previous_actual_dose_unit,
        previous_actual_volume_ml, previous_injection_site_id, previous_notes
      ) values (
        ${crypto.randomUUID()}, ${recordId}, ${current.status}, ${current.actualDate},
        ${current.actualTime}, ${current.actualDoseAmount}, ${current.actualDoseUnit}, ${current.actualVolumeMl},
        ${current.injectionSiteId}, ${current.notes}
      )
    `;
    await transaction`
      update injection_record
      set status = ${value.status}, actual_date = ${value.actualDate},
        actual_time = ${value.actualTime}, actual_dose_amount = ${value.actualDoseAmount},
        actual_dose_unit = ${value.actualDoseUnit}, actual_volume_ml = ${value.actualVolumeMl},
        injection_site_id = ${value.injectionSiteId},
        notes = ${value.notes}, updated_at = now()
      where id = ${recordId}
    `;
  });
}

export async function getInjectionRecordsForCycle(
  actor: AuthenticatedActor,
  cycleId: string,
) {
  await getProtocolCycle(actor, cycleId);
  const sql = getPostgresClient();
  return sql<InjectionRecordRow[]>`
    select ${sql.unsafe(recordSelection())}
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId} and record.cycle_id = ${cycleId}
    order by record.scheduled_date desc, record.scheduled_time desc nulls last, record.created_at desc
  `;
}

export async function getInjectionHistory(
  actor: AuthenticatedActor,
  filters: InjectionHistoryFilters = {},
): Promise<InjectionHistoryResult> {
  if (filters.dateFrom) parseCalendarDate(filters.dateFrom);
  if (filters.dateTo) parseCalendarDate(filters.dateTo);
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw new InjectionRecordError("Start date must be on or before end date.", "invalid");
  }
  if (filters.status && !statuses.has(filters.status)) {
    throw new InjectionRecordError("Choose a valid injection status.", "invalid");
  }
  if (filters.injectionSiteId && !isInjectionSiteId(filters.injectionSiteId)) {
    throw new InjectionRecordError("Choose a valid injection site.", "invalid");
  }

  const sql = getPostgresClient();
  const pageSize = Math.min(Math.max(Math.trunc(filters.pageSize ?? 20), 1), 100);
  const requestedPage = Math.max(Math.trunc(filters.page ?? 1), 1);
  const query = filters.query?.trim() || null;
  const conditions = [sql`record.owner_user_id = ${actor.userId}`];
  if (filters.dateFrom) conditions.push(sql`coalesce(record.actual_date, record.scheduled_date) >= ${filters.dateFrom}::date`);
  if (filters.dateTo) conditions.push(sql`coalesce(record.actual_date, record.scheduled_date) <= ${filters.dateTo}::date`);
  if (filters.peptideId) conditions.push(sql`record.catalogue_entry_id = ${filters.peptideId}`);
  if (filters.cycleId) conditions.push(sql`record.cycle_id = ${filters.cycleId}`);
  if (filters.status) conditions.push(sql`record.status = ${filters.status}`);
  if (filters.injectionSiteId) conditions.push(sql`record.injection_site_id = ${filters.injectionSiteId}`);
  if (query) conditions.push(sql`(catalogue.display_name ilike ${`%${query}%`} or cycle.name ilike ${`%${query}%`} or coalesce(record.notes, '') ilike ${`%${query}%`})`);
  const where = conditions.reduce((left, right) => sql`${left} and ${right}`);
  const [count] = await sql<{ total: number }[]>`
    select count(*)::int as total
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where ${where}
  `;
  const total = count?.total ?? 0;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * pageSize;
  const records = filters.sort === "asc"
    ? await sql<InjectionRecordRow[]>`
        select ${sql.unsafe(recordSelection())}
        from injection_record record
        join protocol_cycle cycle on cycle.id = record.cycle_id
        join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
        where ${where}
        order by coalesce(record.actual_date, record.scheduled_date), coalesce(record.actual_time, record.scheduled_time) nulls last, record.created_at, record.id
        limit ${pageSize} offset ${offset}
      `
    : await sql<InjectionRecordRow[]>`
        select ${sql.unsafe(recordSelection())}
        from injection_record record
        join protocol_cycle cycle on cycle.id = record.cycle_id
        join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
        where ${where}
        order by coalesce(record.actual_date, record.scheduled_date) desc, coalesce(record.actual_time, record.scheduled_time) desc nulls last, record.created_at desc, record.id desc
        limit ${pageSize} offset ${offset}
      `;
  return { filters, page, pageCount, pageSize, records, total };
}

export async function getInjectionHistoryFilterOptions(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  const peptides = await sql<{ id: string; name: string }[]>`
    select distinct catalogue.id, catalogue.display_name as name
    from injection_record record
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId}
    order by catalogue.display_name
  `;
  const cycles = await sql<{ id: string; name: string }[]>`
    select distinct cycle.id, cycle.name
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    where record.owner_user_id = ${actor.userId}
    order by cycle.name
  `;
  return { cycles, peptides };
}

export async function getInjectionRecordsForRange(
  actor: AuthenticatedActor,
  startDate: string,
  endDate: string,
) {
  parseCalendarDate(startDate);
  parseCalendarDate(endDate);
  const sql = getPostgresClient();
  return sql<InjectionRecordRow[]>`
    select ${sql.unsafe(recordSelection())}
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId}
      and record.scheduled_date between ${startDate}::date and ${endDate}::date
    order by record.scheduled_date, record.scheduled_time nulls last, record.id
  `;
}

export async function getCalendarInjectionActions(
  actor: AuthenticatedActor,
  startDate: string,
  endDate: string,
  today: string,
) {
  const [events, records] = await Promise.all([
    getScheduledEvents(actor, startDate, endDate, { includeCompleted: true }),
    getInjectionRecordsForRange(actor, startDate, endDate),
  ]);
  const byOccurrence = new Map(records.map((record) => [record.scheduledOccurrenceId, record]));
  const projected = events.map((event) => {
    const record = byOccurrence.get(event.id) ?? null;
    const state: DashboardInjectionState = record?.status ?? (event.date < today ? "overdue" : "pending");
    return { event, record, state };
  });
  const eventIds = new Set(events.map((event) => event.id));
  for (const record of records) {
    if (eventIds.has(record.scheduledOccurrenceId)) continue;
    projected.push({
      event: {
        catalogueEntryId: record.catalogueEntryId,
        cycleId: record.cycleId,
        cycleName: record.cycleName,
        date: record.scheduledDate,
        doseAmount: record.scheduledDoseAmount,
        doseUnit: record.scheduledDoseUnit,
        id: record.scheduledOccurrenceId,
        peptideName: record.peptideName,
        revisionId: record.scheduleRevisionId,
        scheduleStepId: record.scheduleStepId,
        timeOfDay: record.scheduledTime,
      },
      record,
      state: record.status,
    });
  }
  return projected.sort((left, right) =>
    left.event.date.localeCompare(right.event.date) ||
    (left.event.timeOfDay ?? "99:99").localeCompare(right.event.timeOfDay ?? "99:99") ||
    left.event.peptideName.localeCompare(right.event.peptideName),
  );
}

export async function getDailyInjectionSchedule(actor: AuthenticatedActor, date: string) {
  const events = await getDailySchedule(actor, date);
  const sql = getPostgresClient();
  const records = await sql<InjectionRecordRow[]>`
    select ${sql.unsafe(recordSelection())}
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId} and record.scheduled_date = ${date}
  `;
  const byOccurrence = new Map(records.map((record) => [record.scheduledOccurrenceId, record]));
  return events.map((event) => ({ event, record: byOccurrence.get(event.id) ?? null }));
}

export type DashboardInjectionState = InjectionStatus | "overdue" | "pending";

export type DashboardInjectionAction = {
  event: ScheduledProtocolEvent;
  record: InjectionRecordRow | null;
  state: DashboardInjectionState;
};

export function classifyDashboardInjectionActions(
  events: ScheduledProtocolEvent[],
  records: InjectionRecordRow[],
  today: string,
) {
  parseCalendarDate(today);
  const byOccurrence = new Map(records.map((record) => [record.scheduledOccurrenceId, record]));
  const todayActions: DashboardInjectionAction[] = [];
  const overdueActions: DashboardInjectionAction[] = [];
  for (const event of events) {
    const record = byOccurrence.get(event.id) ?? null;
    if (event.date === today) {
      todayActions.push({ event, record, state: record?.status ?? "pending" });
    } else if (event.date < today && !record) {
      overdueActions.push({ event, record: null, state: "overdue" });
    }
  }
  const pendingCount = todayActions.filter((action) => action.state === "pending").length
    + overdueActions.length;
  return {
    hasPendingActions: pendingCount > 0,
    overdueActions,
    pendingCount,
    todayActions,
  };
}

export async function getDashboardInjectionActions(actor: AuthenticatedActor, today: string) {
  parseCalendarDate(today);
  const sql = getPostgresClient();
  const [range] = await sql<{ startDate: string | null }[]>`
    select min(start_date)::text as "startDate"
    from protocol_cycle
    where owner_user_id = ${actor.userId}
      and status in ('active', 'paused')
      and start_date <= ${today}::date
      and planned_end_date >= ${today}::date
  `;
  if (!range?.startDate) return classifyDashboardInjectionActions([], [], today);
  const events = await getScheduledEvents(actor, range.startDate, today);
  const records = await sql<InjectionRecordRow[]>`
    select ${sql.unsafe(recordSelection())}
    from injection_record record
    join protocol_cycle cycle on cycle.id = record.cycle_id
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId}
      and record.scheduled_date between ${range.startDate}::date and ${today}::date
  `;
  return classifyDashboardInjectionActions(events, records, today);
}

export type AdherenceRecord = Pick<InjectionRecordRow, "scheduledOccurrenceId" | "status">;

export function calculateAdherence(
  events: ScheduledProtocolEvent[],
  records: AdherenceRecord[],
  asOfDate: string,
  asOfTime: string | null = null,
) {
  parseCalendarDate(asOfDate);
  if (asOfTime !== null && !timePattern.test(asOfTime)) {
    throw new InjectionRecordError("Adherence time must be valid.", "invalid");
  }
  const byOccurrence = new Map(records.map((record) => [record.scheduledOccurrenceId, record]));
  const applicable = events.filter((event) => {
    if (event.date < asOfDate) return true;
    if (event.date > asOfDate) return false;
    if (byOccurrence.has(event.id)) return true;
    return Boolean(asOfTime && event.timeOfDay && event.timeOfDay <= asOfTime);
  });
  let completed = 0;
  let skipped = 0;
  let missed = 0;
  let overdue = 0;
  for (const event of applicable) {
    const status = byOccurrence.get(event.id)?.status;
    if (status === "completed") completed += 1;
    else if (status === "skipped") skipped += 1;
    else if (status === "missed") missed += 1;
    else overdue += 1;
  }
  const scheduled = applicable.length;
  return {
    completed,
    missed,
    overdue,
    percentage: scheduled === 0 ? null : Math.round((completed / scheduled) * 1000) / 10,
    scheduled,
    skipped,
  };
}

export async function getCycleAdherence(
  actor: AuthenticatedActor,
  cycleId: string,
  asOfDate: string,
  asOfTime: string | null = null,
) {
  const cycle = await getProtocolCycle(actor, cycleId);
  if (!cycle) throw new InjectionRecordError("Cycle not found.", "not_found");
  if (cycle.status === "cancelled" || asOfDate < cycle.startDate) {
    return calculateAdherence([], [], asOfDate, asOfTime);
  }
  const endCandidates = [asOfDate, cycle.plannedEndDate, cycle.endedOn].filter(
    (value): value is string => Boolean(value),
  );
  const endDate = endCandidates.sort()[0];
  const events: ScheduledProtocolEvent[] = [];
  let chunkStart = cycle.startDate;
  while (chunkStart <= endDate) {
    const remainingDays = calendarDayDifference(chunkStart, endDate);
    const chunkEnd = addCalendarDays(chunkStart, Math.min(remainingDays, 62));
    events.push(
      ...(await getScheduledEvents(actor, chunkStart, chunkEnd, {
        includeCompleted: true,
      })).filter((event) => event.cycleId === cycleId),
    );
    chunkStart = addCalendarDays(chunkEnd, 1);
  }
  const records = await getInjectionRecordsForCycle(actor, cycleId);
  return calculateAdherence(events, records, asOfDate, asOfTime);
}
