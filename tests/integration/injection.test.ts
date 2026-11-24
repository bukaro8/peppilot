import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `i01-test-${Date.now()}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
const cycleId = `${prefix}-cycle`;
const otherCycleId = `${prefix}-overlap-cycle`;
const revisionId = `${prefix}-revision`;
const otherRevisionId = `${prefix}-overlap-revision`;
const firstStepId = `${prefix}-step-1`;
const secondStepId = `${prefix}-step-2`;
const overlapStepId = `${prefix}-step-overlap`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let injections: typeof import("@/lib/injection/service");
let rotation: typeof import("@/lib/injection/rotation-service");
let owner: AuthenticatedActor;
let other: AuthenticatedActor;
let completedRecordId = "";
let skippedRecordId = "";
let missedRecordId = "";

const occurrence = (revision: string, step: string, date: string) => `${revision}:${step}:${date}`;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  injections = await import("@/lib/injection/service");
  rotation = await import("@/lib/injection/rotation-service");
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;

  await sql`insert into "user" (id, name, email, email_verified, role) values (${ownerId}, 'I01 owner', ${`${prefix}-owner@example.test`}, true, 'member'), (${otherId}, 'I01 other', ${`${prefix}-other@example.test`}, true, 'member')`;
  await sql`insert into protocol_cycle (id, owner_user_id, name, start_date, planned_end_date, status) values (${cycleId}, ${ownerId}, 'I01 cycle', '2026-04-01', '2026-04-03', 'active'), (${otherCycleId}, ${ownerId}, 'I01 overlapping cycle', '2026-04-01', '2026-04-03', 'active')`;
  await sql`insert into protocol_cycle_schedule_revision (id, cycle_id, revision_number, effective_from, template_schedule_matches) values (${revisionId}, ${cycleId}, 1, '2026-04-01', false), (${otherRevisionId}, ${otherCycleId}, 1, '2026-04-01', false)`;
  await sql`insert into protocol_cycle_schedule_entry (id, revision_id, catalogue_entry_id, position) values (${`${prefix}-entry-1`}, ${revisionId}, 'catalogue-semax', 1), (${`${prefix}-entry-2`}, ${revisionId}, 'catalogue-wolverine-blend', 2), (${`${prefix}-entry-overlap`}, ${otherRevisionId}, 'catalogue-bpc-157', 1)`;
  await sql`insert into protocol_cycle_schedule_step (id, revision_entry_id, dose_amount, dose_unit, frequency, days_of_week, interval_days, time_of_day, start_day, end_day, position) values (${firstStepId}, ${`${prefix}-entry-1`}, 0.5, 'mg', 'daily', '{}', null, '08:00', 1, 3, 1), (${secondStepId}, ${`${prefix}-entry-2`}, 1, 'mg', 'daily', '{}', null, '12:00', 1, 3, 2), (${overlapStepId}, ${`${prefix}-entry-overlap`}, 250, 'mcg', 'daily', '{}', null, '18:00', 1, 3, 1)`;
});

afterAll(async () => {
  await sql`delete from protocol_cycle where owner_user_id = ${ownerId}`;
  await sql`delete from "user" where id in (${ownerId}, ${otherId})`;
  await sql.end();
});

describe("private injection records", () => {
  it("records completed and skipped occurrences with planned values preserved", async () => {
    const first = occurrence(revisionId, firstStepId, "2026-04-01");
    completedRecordId = (await injections.createInjectionRecord(owner, first, {
      actualDate: "2026-04-01", actualDoseAmount: "0.75", actualDoseUnit: "mg",
      actualTime: "08:15", actualVolumeMl: "0.9", injectionSiteId: "abdomen_left_upper",
      notes: "Adjusted actual amount.", status: "completed",
    })).recordId;
    skippedRecordId = (await injections.createInjectionRecord(
      owner,
      occurrence(revisionId, secondStepId, "2026-04-01"),
      { actualDate: "2026-04-01", actualDoseAmount: "9", actualDoseUnit: "mg", actualTime: "12:00", injectionSiteId: "upper_arm_left", status: "skipped" },
    )).recordId;

    expect(await injections.getInjectionRecord(owner, completedRecordId)).toMatchObject({
      actualDoseAmount: "0.7500", actualVolumeMl: "0.9000", injectionSiteId: "abdomen_left_upper",
      scheduledDoseAmount: "0.5000", status: "completed",
    });
    expect(await injections.getInjectionRecord(owner, skippedRecordId)).toMatchObject({
      actualDate: null, actualDoseAmount: null, actualDoseUnit: null,
      injectionSiteId: null, status: "skipped",
    });
    await expect(injections.createInjectionRecord(owner, first, {
      actualDate: "2026-04-01", actualDoseAmount: "0.5", actualDoseUnit: "mg", actualTime: "08:00", status: "completed",
    })).rejects.toMatchObject({ code: "conflict" });
  });

  it("changes and clears an optional site while preserving correction history", async () => {
    await injections.updateInjectionRecord(owner, completedRecordId, {
      actualDate: "2026-04-01", actualDoseAmount: "0.75", actualDoseUnit: "mg",
      actualTime: "08:15", injectionSiteId: "thigh_right_lower", status: "completed",
    });
    expect(await injections.getInjectionRecord(owner, completedRecordId)).toMatchObject({
      injectionSiteId: "thigh_right_lower",
    });
    await injections.updateInjectionRecord(owner, completedRecordId, {
      actualDate: "2026-04-01", actualDoseAmount: "0.75", actualDoseUnit: "mg",
      actualTime: "08:15", injectionSiteId: null, status: "completed",
    });
    expect(await injections.getInjectionRecord(owner, completedRecordId)).toMatchObject({
      injectionSiteId: null,
    });
    const history = await sql<{ previousActualVolumeMl: string | null; previousInjectionSiteId: string | null }[]>`
      select previous_actual_volume_ml::text as "previousActualVolumeMl",
        previous_injection_site_id as "previousInjectionSiteId"
      from injection_record_history where injection_record_id = ${completedRecordId}
      order by changed_at
    `;
    expect(history.map((entry) => entry.previousInjectionSiteId)).toEqual([
      "abdomen_left_upper", "thigh_right_lower",
    ]);
    expect(history.map((entry) => entry.previousActualVolumeMl)).toEqual(["0.9000", null]);
  });

  it("supports multiple same-day injections across overlapping cycles", async () => {
    const overlap = await injections.createInjectionRecord(
      owner,
      occurrence(otherRevisionId, overlapStepId, "2026-04-01"),
      { actualDate: "2026-04-01", actualDoseAmount: "240", actualDoseUnit: "mcg", actualTime: "18:10", injectionSiteId: "upper_arm_left", status: "completed" },
    );
    expect(overlap.recordId).not.toBe(completedRecordId);
    expect(await injections.getInjectionRecordsForCycle(owner, cycleId)).toHaveLength(2);
    expect(await injections.getInjectionRecordsForCycle(owner, otherCycleId)).toHaveLength(1);
  });

  it("records missed status and retains correction history", async () => {
    missedRecordId = (await injections.createInjectionRecord(
      owner,
      occurrence(revisionId, firstStepId, "2026-04-02"),
      { status: "missed" },
    )).recordId;
    expect(await injections.getInjectionRecord(owner, missedRecordId)).toMatchObject({ status: "missed" });
    await injections.updateInjectionRecord(owner, missedRecordId, {
      actualDate: "2026-04-02", actualDoseAmount: "0.6", actualDoseUnit: "mg", actualTime: "09:00", injectionSiteId: "thigh_left_upper", status: "completed",
    });
    expect(await injections.getInjectionRecord(owner, missedRecordId)).toMatchObject({ status: "completed", actualDoseAmount: "0.6000", scheduledDoseAmount: "0.5000" });
    const [history] = await sql<{ count: number }[]>`select count(*)::int as count from injection_record_history where injection_record_id = ${missedRecordId}`;
    expect(history.count).toBe(1);
  });

  it("combines protocols, applies private disabled sites, and recalculates corrections", async () => {
    const combined = await rotation.getInjectionSiteRotation(owner, "2026-04-02");
    expect(combined.activity.upper_arm_left).toBe("red");
    expect(combined.lastUsed.upper_arm_left).toBe("2026-04-01");
    expect(combined.activity.thigh_left_upper).toBe("red");
    const isolated = await rotation.getInjectionSiteRotation(other, "2026-04-02");
    expect(isolated.activity.upper_arm_left).toBe("neutral");
    expect(isolated.activity.thigh_left_upper).toBe("neutral");

    await rotation.updateDisabledInjectionSiteIds(owner, [
      "abdomen_left_upper", "abdomen_left_lower",
    ]);
    expect(await rotation.getDisabledInjectionSiteIds(owner)).toEqual([
      "abdomen_left_lower", "abdomen_left_upper",
    ]);
    expect(await rotation.getDisabledInjectionSiteIds(other)).toEqual([]);
    expect((await rotation.getInjectionSiteRotation(owner, "2026-04-02")).suggestedSiteId)
      .toBe("abdomen_right_upper");

    await injections.updateInjectionRecord(owner, missedRecordId, {
      actualDate: "2026-04-02", actualDoseAmount: "0.6", actualDoseUnit: "mg",
      actualTime: "09:00", injectionSiteId: "abdomen_right_lower", status: "completed",
    });
    const corrected = await rotation.getInjectionSiteRotation(owner, "2026-04-02");
    expect(corrected.activity.thigh_left_upper).toBe("neutral");
    expect(corrected.activity.abdomen_right_lower).toBe("red");
  });

  it("calculates adherence from due occurrences without mixing cycles", async () => {
    expect(await injections.getCycleAdherence(owner, cycleId, "2026-04-02")).toEqual({
      completed: 2, missed: 0, overdue: 0, percentage: 66.7, scheduled: 3, skipped: 1,
    });
  });

  it("enforces cross-account isolation", async () => {
    await expect(injections.getInjectionRecord(other, completedRecordId)).rejects.toMatchObject({ status: 403 });
    await expect(injections.updateInjectionRecord(other, completedRecordId, { status: "missed" })).rejects.toMatchObject({ status: 403 });
    await expect(injections.createInjectionRecord(
      other,
      occurrence(revisionId, secondStepId, "2026-04-02"),
      { status: "missed" },
    )).rejects.toMatchObject({ code: "not_found" });
  });

  it("filters, sorts, and paginates owner-scoped history", async () => {
    const completed = await injections.getInjectionHistory(owner, {
      dateFrom: "2026-04-01", dateTo: "2026-04-02", page: 1, pageSize: 1,
      peptideId: "catalogue-semax", sort: "asc", status: "completed",
    });
    expect(completed.total).toBe(2);
    expect(completed.pageCount).toBe(2);
    expect(completed.records).toHaveLength(1);
    expect(completed.records[0]).toMatchObject({
      catalogueEntryId: "catalogue-semax", ownerUserId: ownerId, scheduledDate: "2026-04-01",
    });
    const secondPage = await injections.getInjectionHistory(owner, {
      dateFrom: "2026-04-01", dateTo: "2026-04-02", page: 2, pageSize: 1,
      peptideId: "catalogue-semax", sort: "asc", status: "completed",
    });
    expect(secondPage.records[0].scheduledDate).toBe("2026-04-02");
    expect((await injections.getInjectionHistory(owner, { injectionSiteId: "abdomen_right_lower" })).records)
      .toEqual([expect.objectContaining({ id: missedRecordId })]);
    expect((await injections.getInjectionHistory(other)).records).toEqual([]);
  });

  it("projects multiple occurrences and corrected statuses into the calendar", async () => {
    const before = await injections.getCalendarInjectionActions(owner, "2026-04-01", "2026-04-02", "2026-04-03");
    expect(before.filter((action) => action.event.date === "2026-04-01")).toHaveLength(3);
    expect(before.find((action) => action.record?.id === completedRecordId)?.state).toBe("completed");
    expect(before.find((action) => action.record?.id === skippedRecordId)?.state).toBe("skipped");

    await injections.updateInjectionRecord(owner, skippedRecordId, { status: "missed" });
    const corrected = await injections.getCalendarInjectionActions(owner, "2026-04-01", "2026-04-02", "2026-04-03");
    expect(corrected.find((action) => action.record?.id === skippedRecordId)?.state).toBe("missed");
    expect(await injections.getCalendarInjectionActions(other, "2026-04-01", "2026-04-02", "2026-04-03"))
      .toEqual([]);
  });

  it("builds owner-scoped daily and overdue actions across overlapping cycles", async () => {
    const aprilSecond = await injections.getDashboardInjectionActions(owner, "2026-04-02");
    expect(aprilSecond.todayActions).toHaveLength(3);
    expect(aprilSecond.todayActions.map((action) => action.event.cycleId)).toContain(otherCycleId);
    expect(aprilSecond.pendingCount).toBe(2);

    const aprilThird = await injections.getDashboardInjectionActions(owner, "2026-04-03");
    expect(aprilThird.overdueActions).toHaveLength(2);
    expect(aprilThird.todayActions).toHaveLength(3);
    expect(aprilThird.pendingCount).toBe(5);

    const isolated = await injections.getDashboardInjectionActions(other, "2026-04-03");
    expect(isolated.todayActions).toEqual([]);
    expect(isolated.overdueActions).toEqual([]);
    expect(isolated.hasPendingActions).toBe(false);

    await sql`update protocol_cycle set status = 'completed', ended_on = '2026-04-02' where id = ${otherCycleId}`;
    const completedExcluded = await injections.getDashboardInjectionActions(owner, "2026-04-03");
    expect(completedExcluded.todayActions).toHaveLength(2);
    expect(completedExcluded.todayActions.every((action) => action.event.cycleId === cycleId)).toBe(true);
    await sql`update protocol_cycle set status = 'active', ended_on = null where id = ${otherCycleId}`;

    await sql`update protocol_cycle set status = 'paused' where id = ${cycleId}`;
    await sql`insert into protocol_cycle_pause (id, cycle_id, paused_on) values (${`${prefix}-dashboard-pause`}, ${cycleId}, '2026-04-03')`;
    const pausedSuppressed = await injections.getDashboardInjectionActions(owner, "2026-04-03");
    expect(pausedSuppressed.todayActions).toHaveLength(1);
    expect(pausedSuppressed.todayActions[0].event.cycleId).toBe(otherCycleId);
    await sql`delete from protocol_cycle_pause where id = ${`${prefix}-dashboard-pause`}`;
    await sql`update protocol_cycle set status = 'active' where id = ${cycleId}`;
  });
});
