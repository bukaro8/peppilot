import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `h04-h06-test-${Date.now()}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
const cycleOne = `${prefix}-cycle-one`;
const cycleTwo = `${prefix}-cycle-two`;
const measurementBoundary = `${prefix}-measurement-boundary`;
const measurementLatest = `${prefix}-measurement-latest`;
const measurementSameDayEarlier = `${prefix}-measurement-earlier`;
const measurementSecondCycle = `${prefix}-measurement-second-cycle`;
const checkInId = `${prefix}-check-in`;
const symptomId = `${prefix}-symptom`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let goals: typeof import("@/lib/health/cycle-goal-service");
let journal: typeof import("@/lib/health/journal-service");
let checkIns: typeof import("@/lib/health/check-in-service");
let owner: AuthenticatedActor;
let other: AuthenticatedActor;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  sql = (await import("@/lib/db")).getPostgresClient();
  goals = await import("@/lib/health/cycle-goal-service");
  journal = await import("@/lib/health/journal-service");
  checkIns = await import("@/lib/health/check-in-service");
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;
  await sql`insert into "user" (id, name, email, email_verified, role) values (${ownerId}, 'Journal owner', ${`${prefix}-owner@example.test`}, true, 'member'), (${otherId}, 'Journal other', ${`${prefix}-other@example.test`}, true, 'member')`;
  await sql`insert into protocol_cycle (id, owner_user_id, name, start_date, planned_end_date, status) values (${cycleOne}, ${ownerId}, 'First independent cycle', '2026-10-20', '2026-11-20', 'active'), (${cycleTwo}, ${ownerId}, 'Repeated independent cycle', '2026-10-25', '2026-11-25', 'active')`;
  await sql`insert into health_measurement (id, owner_user_id, metric_id, observed_on, canonical_value, canonical_unit, entered_value, entered_unit, source, created_at) values
    (${measurementBoundary}, ${ownerId}, 'weight', '2026-10-13', 92, 'kg', 92, 'kg', 'manual', '2026-10-13T08:00:00Z'),
    (${measurementSameDayEarlier}, ${ownerId}, 'weight', '2026-10-19', 91, 'kg', 91, 'kg', 'manual', '2026-10-19T08:00:00Z'),
    (${measurementLatest}, ${ownerId}, 'weight', '2026-10-19', 90, 'kg', 90, 'kg', 'manual', '2026-10-19T09:00:00Z'),
    (${measurementSecondCycle}, ${ownerId}, 'weight', '2026-10-24', 88, 'kg', 88, 'kg', 'manual', '2026-10-24T08:00:00Z')`;
  await sql`insert into daily_check_in (id, owner_user_id, check_in_date, symptom_status) values (${checkInId}, ${ownerId}, '2026-10-19', 'symptoms_recorded')`;
  await sql`insert into daily_check_in_answer (check_in_id, question_id, score) values (${checkInId}, 'energy', 7), (${checkInId}, 'sleep_quality', 8)`;
  await sql`insert into symptom_record (id, owner_user_id, check_in_id, symptom_date, symptom_id, severity, notes) values (${symptomId}, ${ownerId}, ${checkInId}, '2026-10-21', 'headache', 3, 'Brief')`;
});

afterAll(async () => {
  await sql`delete from "user" where id in (${ownerId}, ${otherId})`;
  await sql.end();
});

describe("cycle goals and baseline snapshots", () => {
  it("selects the latest eligible observation inside the seven days before start", async () => {
    await goals.saveCycleGoals(owner, cycleOne, [
      { metricId: "weight", targetValue: "80" },
      { metricId: "energy", targetValue: "9" },
      { metricId: "waist_circumference", targetValue: null },
    ]);
    const saved = (await goals.getCycleGoals(owner, cycleOne)).goals;
    expect(saved.find((goal) => goal.metricId === "weight")).toMatchObject({ baselineObservedOn: "2026-10-19", baselineSourceId: measurementLatest, baselineStatus: "valid", baselineValue: "90.0000" });
    expect(saved.find((goal) => goal.metricId === "energy")).toMatchObject({ baselineObservedOn: "2026-10-19", baselineSourceId: checkInId, baselineStatus: "valid", baselineValue: "7.0000" });
    expect(saved.find((goal) => goal.metricId === "waist_circumference")).toMatchObject({ baselineSourceType: "none", baselineStatus: "missing", baselineValue: null });
  });

  it("keeps repeated cycles independent and baseline snapshots stable after source edits", async () => {
    await goals.saveCycleGoals(owner, cycleTwo, [{ metricId: "weight", targetValue: "82" }]);
    expect((await goals.getCycleGoals(owner, cycleTwo)).goals[0]).toMatchObject({ baselineSourceId: measurementSecondCycle, baselineValue: "88.0000" });
    await sql`update health_measurement set canonical_value = 70, entered_value = 70, updated_at = now() where id = ${measurementLatest}`;
    expect((await goals.getCycleGoals(owner, cycleOne)).goals.find((goal) => goal.metricId === "weight")).toMatchObject({ baselineSourceId: measurementLatest, baselineValue: "90.0000" });
  });

  it("validates goals, protects terminal snapshots and enforces account isolation", async () => {
    await expect(goals.saveCycleGoals(owner, cycleOne, [{ metricId: "energy", targetValue: "6.5" }])).rejects.toMatchObject({ code: "invalid" });
    await expect(goals.saveCycleGoals(owner, cycleOne, [{ metricId: "weight", targetValue: "10" }])).rejects.toMatchObject({ code: "invalid" });
    await expect(goals.getCycleGoals(other, cycleOne)).rejects.toMatchObject({ status: 403 });
    await sql`update protocol_cycle set status = 'completed', ended_on = '2026-11-20' where id = ${cycleOne}`;
    await expect(goals.saveCycleGoals(owner, cycleOne, [{ metricId: "weight", targetValue: "81" }])).rejects.toMatchObject({ code: "invalid" });
    expect((await goals.getCycleGoals(owner, cycleOne)).goals.find((goal) => goal.metricId === "weight")?.baselineValue).toBe("90.0000");
  });
});

describe("unified private journal", () => {
  it("combines same-day entries chronologically and filters by type, metric and date", async () => {
    const all = await journal.listJournalEntries(owner, journal.parseJournalFilters({ from: "2026-10-19", to: "2026-10-21" }));
    expect(all.filter((entry) => entry.date === "2026-10-19")).toHaveLength(3);
    expect(all[0]).toMatchObject({ cycles: [expect.objectContaining({ id: cycleOne })], date: "2026-10-21", recordType: "symptom" });
    const weight = await journal.listJournalEntries(owner, journal.parseJournalFilters({ metric: "weight" }));
    expect(weight).toHaveLength(4);
    expect(weight.every((entry) => entry.recordType === "measurement")).toBe(true);
    const energy = await journal.listJournalEntries(owner, journal.parseJournalFilters({ metric: "energy", type: "check_in" }));
    expect(energy).toEqual([expect.objectContaining({ id: checkInId, recordType: "check_in" })]);
    expect(await journal.listJournalEntries(other, journal.parseJournalFilters({}))).toEqual([]);
  });

  it("deletes an owner check-in without deleting its symptom record", async () => {
    await expect(checkIns.deleteDailyCheckIn(other, "2026-10-19")).rejects.toMatchObject({ code: "not_found" });
    await checkIns.deleteDailyCheckIn(owner, "2026-10-19");
    const [symptom] = await sql<{ checkInId: string | null }[]>`select check_in_id as "checkInId" from symptom_record where id = ${symptomId}`;
    expect(symptom.checkInId).toBeNull();
    expect(await journal.listJournalEntries(owner, journal.parseJournalFilters({ type: "symptom" }))).toHaveLength(1);
  });
});
