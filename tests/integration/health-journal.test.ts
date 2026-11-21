import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `h02-h03-test-${Date.now()}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
const categories = ["catalogue-semaglutide", "catalogue-retatrutide", "catalogue-semax"];
const cycleIds = categories.map((_, index) => `${prefix}-cycle-${index}`);
const symptomOne = "33333333-3333-4333-8333-333333333333";
const symptomTwo = "44444444-4444-4444-8444-444444444444";

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let checkIns: typeof import("@/lib/health/check-in-service");
let symptoms: typeof import("@/lib/health/symptom-service");
let owner: AuthenticatedActor;
let other: AuthenticatedActor;
let checkInId = "";

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  sql = (await import("@/lib/db")).getPostgresClient();
  checkIns = await import("@/lib/health/check-in-service");
  symptoms = await import("@/lib/health/symptom-service");
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;
  await sql`insert into "user" (id, name, email, email_verified, role) values (${ownerId}, 'H02 owner', ${`${prefix}-owner@example.test`}, true, 'member'), (${otherId}, 'H02 other', ${`${prefix}-other@example.test`}, true, 'member')`;
  for (let index = 0; index < categories.length; index += 1) {
    const cycleId = cycleIds[index]; const revisionId = `${prefix}-revision-${index}`; const entryId = `${prefix}-entry-${index}`;
    await sql`insert into protocol_cycle (id, owner_user_id, name, start_date, planned_end_date, status) values (${cycleId}, ${ownerId}, ${`Cycle ${index}`}, '2026-11-01', '2026-11-10', 'active')`;
    await sql`insert into protocol_cycle_schedule_revision (id, cycle_id, revision_number, effective_from, template_schedule_matches) values (${revisionId}, ${cycleId}, 1, '2026-11-01', false)`;
    await sql`insert into protocol_cycle_schedule_entry (id, revision_id, catalogue_entry_id, position) values (${entryId}, ${revisionId}, ${categories[index]}, 1)`;
    await sql`insert into protocol_cycle_schedule_step (id, revision_entry_id, dose_amount, dose_unit, frequency, days_of_week, interval_days, time_of_day, start_day, end_day, position) values (${`${prefix}-step-${index}`}, ${entryId}, 1, 'unit', 'daily', '{}', null, null, 1, 10, 1)`;
  }
});

afterAll(async () => {
  await sql`delete from protocol_cycle where owner_user_id = ${ownerId}`;
  await sql`delete from "user" where id in (${ownerId}, ${otherId})`;
  await sql.end();
});

describe("adaptive daily check-ins", () => {
  it("combines and deduplicates questions from overlapping active cycles", async () => {
    expect((await checkIns.getAdaptiveQuestions(owner, "2026-11-04")).map((question) => question.id)).toEqual([
      "sleep_quality", "energy", "recovery", "appetite_control", "waist_body_composition", "focus", "stress",
    ]);
    expect((await checkIns.getAdaptiveQuestions(other, "2026-11-04")).map((question) => question.id)).toEqual(["sleep_quality", "energy", "recovery"]);
  });

  it("persists question customisation", async () => {
    await checkIns.updateQuestionPreferences(owner, ["appetite_control", "pain_mobility", "stress"]);
    expect((await checkIns.getAdaptiveQuestions(owner, "2026-11-04")).map((question) => question.id)).toEqual([
      "sleep_quality", "energy", "recovery", "appetite_control", "stress",
    ]);
  });

  it("creates and edits one shared dated check-in while optional answers may be skipped", async () => {
    const first = await checkIns.saveDailyCheckIn(owner, "2026-11-04", [
      { questionId: "sleep_quality", score: 7 }, { questionId: "energy", score: 6 },
      { questionId: "recovery", score: 8 }, { questionId: "appetite_control", score: null },
      { questionId: "stress", score: 5 }, { questionId: "pain_mobility", score: null },
    ], "no_symptoms");
    const second = await checkIns.saveDailyCheckIn(owner, "2026-11-04", [
      { questionId: "sleep_quality", score: 8 }, { questionId: "energy", score: 7 },
      { questionId: "recovery", score: 8 }, { questionId: "stress", score: 6 },
    ], "not_answered");
    expect(second.id).toBe(first.id); checkInId = first.id;
    expect(await checkIns.listDailyCheckIns(owner)).toEqual([expect.objectContaining({ answerCount: 4, checkInDate: "2026-11-04", symptomStatus: "not_answered" })]);
    expect((await checkIns.getDailyCheckIn(owner, "2026-11-04"))?.answers).toContainEqual({ questionId: "energy", score: 7 });
    expect(await checkIns.listDailyCheckIns(other)).toEqual([]);
  });

  it("validates required scores and standard scales", async () => {
    await expect(checkIns.saveDailyCheckIn(owner, "2026-11-03", [{ questionId: "sleep_quality", score: 7 }], "not_answered")).rejects.toMatchObject({ code: "invalid" });
    await expect(checkIns.saveDailyCheckIn(owner, "2026-11-03", [{ questionId: "sleep_quality", score: 11 }, { questionId: "energy", score: 5 }, { questionId: "recovery", score: 5 }], "not_answered")).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("private symptom diary", () => {
  it("records multiple symptoms on one day and updates the linked check-in", async () => {
    await symptoms.createSymptom(owner, { id: symptomOne, checkInId, symptomDate: "2026-11-04", symptomId: "headache", severity: 4, startedAt: "09:00", endedAt: "10:00" });
    await symptoms.createSymptom(owner, { id: symptomTwo, checkInId, symptomDate: "2026-11-04", symptomId: "nausea", severity: 3, notes: "Brief" });
    expect(await symptoms.listSymptoms(owner, "2026-11-04")).toHaveLength(2);
    expect((await checkIns.getDailyCheckIn(owner, "2026-11-04"))?.symptomStatus).toBe("symptoms_recorded");
  });

  it("edits standard symptoms into validated custom records", async () => {
    await symptoms.updateSymptom(owner, symptomTwo, { checkInId, symptomDate: "2026-11-04", symptomId: "custom", customDescription: "Dry mouth", severity: 2, notes: "Corrected" });
    expect(await symptoms.getSymptom(owner, symptomTwo)).toMatchObject({ customDescription: "Dry mouth", severity: 2, symptomId: "custom" });
    await expect(symptoms.createSymptom(owner, { symptomDate: "2026-11-04", symptomId: "custom", severity: 2 })).rejects.toMatchObject({ code: "invalid" });
    await expect(symptoms.createSymptom(owner, { symptomDate: "2026-11-04", symptomId: "fatigue", severity: 0 })).rejects.toMatchObject({ code: "invalid" });
  });

  it("enforces strict account isolation", async () => {
    await expect(symptoms.getSymptom(other, symptomOne)).rejects.toMatchObject({ status: 403 });
    await expect(symptoms.updateSymptom(other, symptomOne, { symptomDate: "2026-11-04", symptomId: "fatigue", severity: 5 })).rejects.toMatchObject({ status: 403 });
    await expect(symptoms.deleteSymptom(other, symptomOne)).rejects.toMatchObject({ status: 403 });
    expect(await symptoms.listSymptoms(other)).toEqual([]);
  });

  it("deletes symptom records and restores unanswered state after the last linked record", async () => {
    await symptoms.deleteSymptom(owner, symptomOne);
    expect(await symptoms.listSymptoms(owner, "2026-11-04")).toHaveLength(1);
    await symptoms.deleteSymptom(owner, symptomTwo);
    expect(await symptoms.listSymptoms(owner, "2026-11-04")).toEqual([]);
    expect((await checkIns.getDailyCheckIn(owner, "2026-11-04"))?.symptomStatus).toBe("not_answered");
  });
});
