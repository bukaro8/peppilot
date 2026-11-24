import "server-only";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { getCycleScheduleDataForRange } from "@/lib/protocol-cycle/service";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";
import { catalogueCategories, type CatalogueCategory } from "@/lib/catalogue/constants";
import { checkInQuestions, getCheckInQuestion, isCheckInQuestionId, optionalCheckInQuestions, selectAdaptiveQuestionIds, type CheckInQuestionId, type OptionalCheckInQuestionId } from "@/lib/health/check-in-questions";

export type SymptomPromptStatus = "no_symptoms" | "not_answered" | "symptoms_recorded";
export type CheckInAnswerInput = { questionId: string; score?: number | null };

export class CheckInError extends Error {
  constructor(message: string, readonly code: "invalid" | "not_found") { super(message); this.name = "CheckInError"; }
}

function validateDate(value: string) {
  try { parseCalendarDate(value); } catch { throw new CheckInError("Check-in date must be valid.", "invalid"); }
  if (value < "1900-01-01" || value > new Date().toISOString().slice(0, 10)) throw new CheckInError("Check-in date cannot be in the future.", "invalid");
}

export async function getQuestionPreferences(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  const rows = await sql<{ isEnabled: boolean; questionId: OptionalCheckInQuestionId }[]>`
    select question_id as "questionId", is_enabled as "isEnabled"
    from check_in_question_preference where owner_user_id = ${actor.userId}
  `;
  return Object.fromEntries(rows.map((row) => [row.questionId, row.isEnabled])) as Partial<Record<OptionalCheckInQuestionId, boolean>>;
}

export async function updateQuestionPreferences(actor: AuthenticatedActor, enabledIds: string[]) {
  const enabled = new Set(enabledIds);
  const sql = getPostgresClient();
  await sql.begin(async (tx) => {
    for (const question of optionalCheckInQuestions) {
      await tx`
        insert into check_in_question_preference (owner_user_id, question_id, is_enabled)
        values (${actor.userId}, ${question.id}, ${enabled.has(question.id)})
        on conflict (owner_user_id, question_id) do update
        set is_enabled = excluded.is_enabled, updated_at = now()
      `;
    }
  });
}

export async function getAdaptiveQuestions(actor: AuthenticatedActor, date: string) {
  validateDate(date);
  const [snapshot, preferences] = await Promise.all([
    getCycleScheduleDataForRange(actor, date, date),
    getQuestionPreferences(actor),
  ]);
  const activeCycleIds = new Set(snapshot.cycles.filter((cycle) => cycle.status === "active").map((cycle) => cycle.id));
  const latestRevisions = new Map<string, (typeof snapshot.revisions)[number]>();
  for (const revision of snapshot.revisions) {
    if (activeCycleIds.has(revision.cycleId)) latestRevisions.set(revision.cycleId, revision);
  }
  const catalogueIds = [...new Set([...latestRevisions.values()].flatMap((revision) => revision.steps.map((step) => step.catalogueEntryId)))];
  const categories: CatalogueCategory[] = [];
  if (catalogueIds.length) {
    const sql = getPostgresClient();
    const rows = await sql<{ category: string }[]>`select distinct category from catalogue_entry where id = any(${catalogueIds}) and owner_user_id is null`;
    for (const row of rows) if (catalogueCategories.includes(row.category as CatalogueCategory)) categories.push(row.category as CatalogueCategory);
  }
  return selectAdaptiveQuestionIds(categories, preferences).map((id) => getCheckInQuestion(id)!);
}

export async function getDailyCheckIn(actor: AuthenticatedActor, date: string) {
  validateDate(date);
  const sql = getPostgresClient();
  const [checkIn] = await sql<{ createdAt: Date; id: string; symptomStatus: SymptomPromptStatus; updatedAt: Date }[]>`
    select id, symptom_status as "symptomStatus", created_at as "createdAt", updated_at as "updatedAt"
    from daily_check_in where owner_user_id = ${actor.userId} and check_in_date = ${date}
  `;
  if (!checkIn) return null;
  const answers = await sql<{ questionId: CheckInQuestionId; score: number }[]>`
    select question_id as "questionId", score from daily_check_in_answer where check_in_id = ${checkIn.id}
    order by question_id
  `;
  return { ...checkIn, answers, checkInDate: date, ownerUserId: actor.userId };
}

export async function listDailyCheckIns(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  return sql<{ answerCount: number; checkInDate: string; id: string; symptomStatus: SymptomPromptStatus }[]>`
    select check_in.id, check_in.check_in_date::text as "checkInDate",
      check_in.symptom_status as "symptomStatus", count(answer.question_id)::int as "answerCount"
    from daily_check_in check_in left join daily_check_in_answer answer on answer.check_in_id = check_in.id
    where check_in.owner_user_id = ${actor.userId}
    group by check_in.id order by check_in.check_in_date desc
  `;
}

export async function deleteDailyCheckIn(actor: AuthenticatedActor, date: string) {
  validateDate(date);
  const sql = getPostgresClient();
  const [row] = await sql<{ id: string }[]>`
    select id from daily_check_in where owner_user_id = ${actor.userId} and check_in_date = ${date}
  `;
  if (!row) throw new CheckInError("Daily check-in not found.", "not_found");
  await sql`delete from daily_check_in where id = ${row.id} and owner_user_id = ${actor.userId}`;
}

export async function saveDailyCheckIn(actor: AuthenticatedActor, date: string, answers: CheckInAnswerInput[], symptomStatus: SymptomPromptStatus) {
  validateDate(date);
  if (!(["not_answered", "no_symptoms", "symptoms_recorded"] as string[]).includes(symptomStatus)) throw new CheckInError("Choose a valid symptom response.", "invalid");
  const applicable = await getAdaptiveQuestions(actor, date);
  const applicableIds = new Set(applicable.map((question) => question.id));
  const values = new Map<CheckInQuestionId, number>();
  for (const answer of answers) {
    if (!isCheckInQuestionId(answer.questionId)) throw new CheckInError("Check-in includes an unavailable question.", "invalid");
    if (answer.score === null || answer.score === undefined) continue;
    if (!applicableIds.has(answer.questionId)) throw new CheckInError("Check-in includes an unavailable question.", "invalid");
    if (!Number.isInteger(answer.score) || answer.score < 1 || answer.score > 10) throw new CheckInError("Scores must be whole numbers from 1 to 10.", "invalid");
    values.set(answer.questionId, answer.score);
  }
  for (const question of checkInQuestions.filter((item) => item.core)) if (!values.has(question.id)) throw new CheckInError(`${question.label} is required.`, "invalid");
  const sql = getPostgresClient();
  const id = crypto.randomUUID();
  return sql.begin(async (tx) => {
    const [checkIn] = await tx<{ id: string }[]>`
      insert into daily_check_in (id, owner_user_id, check_in_date, symptom_status)
      values (${id}, ${actor.userId}, ${date}, ${symptomStatus})
      on conflict (owner_user_id, check_in_date) do update
      set symptom_status = excluded.symptom_status, updated_at = now()
      returning id
    `;
    await tx`delete from daily_check_in_answer where check_in_id = ${checkIn.id}`;
    for (const [questionId, score] of values) await tx`
      insert into daily_check_in_answer (check_in_id, question_id, score) values (${checkIn.id}, ${questionId}, ${score})
    `;
    return { id: checkIn.id };
  });
}
