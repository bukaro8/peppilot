import "server-only";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { getCheckInQuestion, type CheckInQuestionId } from "@/lib/health/check-in-questions";
import { getMeasurementLabel } from "@/lib/health/measurement-service";
import { formatMeasurementValue } from "@/lib/health/metrics";
import { isOutcomeMetricId } from "@/lib/health/outcome-metrics";
import { getSymptomLabel, type SymptomId } from "@/lib/health/symptoms";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";

export type JournalRecordType = "check_in" | "measurement" | "symptom";
export type JournalFilters = { dateFrom: string; dateTo: string; metricId: string; recordType: "all" | JournalRecordType };
export type JournalEntry = {
  createdAt: Date;
  cycles: Array<{ id: string; name: string }>;
  date: string;
  href: string;
  id: string;
  recordType: JournalRecordType;
  summary: string;
  title: string;
};

export class JournalError extends Error {
  constructor(message: string) { super(message); this.name = "JournalError"; }
}

export function parseJournalFilters(input: Partial<Record<"from" | "metric" | "to" | "type", string | undefined>>): JournalFilters {
  const recordType = input.type ?? "all";
  if (!(recordType === "all" || recordType === "measurement" || recordType === "check_in" || recordType === "symptom")) throw new JournalError("Choose a valid record type.");
  const metricId = input.metric ?? "";
  if (metricId && !isOutcomeMetricId(metricId)) throw new JournalError("Choose a valid metric.");
  const dateFrom = input.from ?? "";
  const dateTo = input.to ?? "";
  for (const [label, value] of [["From", dateFrom], ["To", dateTo]] as const) {
    if (value) try { parseCalendarDate(value); } catch { throw new JournalError(`${label} date must be valid.`); }
  }
  if (dateFrom && dateTo && dateFrom > dateTo) throw new JournalError("From date must be on or before To date.");
  return { dateFrom, dateTo, metricId, recordType };
}

function isInRange(date: string, filters: JournalFilters) {
  return (!filters.dateFrom || date >= filters.dateFrom) && (!filters.dateTo || date <= filters.dateTo);
}

export async function listJournalEntries(actor: AuthenticatedActor, filters: JournalFilters) {
  const sql = getPostgresClient();
  const [measurements, checkIns, answers, symptoms, cycles] = await Promise.all([
    sql<{ createdAt: Date; enteredUnit: string; enteredValue: string; id: string; metricId: string; observedOn: string }[]>`
      select id, metric_id as "metricId", observed_on::text as "observedOn",
        entered_value::text as "enteredValue", entered_unit as "enteredUnit", created_at as "createdAt"
      from health_measurement where owner_user_id = ${actor.userId}
    `,
    sql<{ checkInDate: string; createdAt: Date; id: string; symptomStatus: string }[]>`
      select id, check_in_date::text as "checkInDate", symptom_status as "symptomStatus", created_at as "createdAt"
      from daily_check_in where owner_user_id = ${actor.userId}
    `,
    sql<{ checkInId: string; questionId: CheckInQuestionId; score: number }[]>`
      select answer.check_in_id as "checkInId", answer.question_id as "questionId", answer.score
      from daily_check_in_answer answer join daily_check_in check_in on check_in.id = answer.check_in_id
      where check_in.owner_user_id = ${actor.userId} order by answer.question_id
    `,
    sql<{ createdAt: Date; customDescription: string | null; id: string; severity: number; symptomDate: string; symptomId: SymptomId }[]>`
      select id, symptom_date::text as "symptomDate", symptom_id as "symptomId",
        custom_description as "customDescription", severity, created_at as "createdAt"
      from symptom_record where owner_user_id = ${actor.userId}
    `,
    sql<{ endDate: string; id: string; name: string; startDate: string }[]>`
      select id, name, start_date::text as "startDate", coalesce(ended_on, planned_end_date)::text as "endDate"
      from protocol_cycle where owner_user_id = ${actor.userId}
    `,
  ]);
  const cyclesForDate = (date: string) => cycles.filter((cycle) => cycle.startDate <= date && cycle.endDate >= date).map(({ id, name }) => ({ id, name }));
  const answersByCheckIn = new Map<string, Array<(typeof answers)[number]>>();
  for (const answer of answers) answersByCheckIn.set(answer.checkInId, [...(answersByCheckIn.get(answer.checkInId) ?? []), answer]);
  const entries: JournalEntry[] = [];

  if (filters.recordType === "all" || filters.recordType === "measurement") for (const item of measurements) {
    if (!isInRange(item.observedOn, filters) || (filters.metricId && filters.metricId !== item.metricId)) continue;
    entries.push({ createdAt: item.createdAt, cycles: cyclesForDate(item.observedOn), date: item.observedOn, href: `/journal/measurements/${item.id}`, id: item.id, recordType: "measurement", summary: formatMeasurementValue(item.enteredValue, item.enteredUnit), title: getMeasurementLabel(item.metricId) });
  }
  if (filters.recordType === "all" || filters.recordType === "check_in") for (const item of checkIns) {
    if (!isInRange(item.checkInDate, filters)) continue;
    const itemAnswers = answersByCheckIn.get(item.id) ?? [];
    if (filters.metricId && !itemAnswers.some((answer) => answer.questionId === filters.metricId)) continue;
    const scoreSummary = itemAnswers.map((answer) => `${getCheckInQuestion(answer.questionId)?.label ?? answer.questionId} ${answer.score}/10`).join(" · ");
    const symptomSummary = item.symptomStatus === "no_symptoms" ? "No symptoms reported" : item.symptomStatus === "symptoms_recorded" ? "Symptoms recorded" : "Symptoms unanswered";
    entries.push({ createdAt: item.createdAt, cycles: cyclesForDate(item.checkInDate), date: item.checkInDate, href: `/journal/check-ins/${item.checkInDate}`, id: item.id, recordType: "check_in", summary: `${scoreSummary || "No scores"} · ${symptomSummary}`, title: "Daily check-in" });
  }
  if (!filters.metricId && (filters.recordType === "all" || filters.recordType === "symptom")) for (const item of symptoms) {
    if (!isInRange(item.symptomDate, filters)) continue;
    entries.push({ createdAt: item.createdAt, cycles: cyclesForDate(item.symptomDate), date: item.symptomDate, href: `/journal/symptoms/${item.id}`, id: item.id, recordType: "symptom", summary: `Severity ${item.severity}/10`, title: getSymptomLabel(item.symptomId, item.customDescription) });
  }
  entries.sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.valueOf() - left.createdAt.valueOf() || right.id.localeCompare(left.id));
  return entries;
}
