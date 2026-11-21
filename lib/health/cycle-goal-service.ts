import "server-only";

import type { TransactionSql } from "postgres";

import { assertPrivateResourceAccess, type AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import {
  classifyBaselineValue,
  getOutcomeMetric,
  isOutcomeMetricId,
  type OutcomeMetricId,
} from "@/lib/health/outcome-metrics";

export type BaselineStatus = "missing" | "unsuitable" | "valid";

export type CycleGoalInput = {
  metricId: string;
  targetValue?: string | null;
};

export type CycleGoalRow = {
  baselineObservedOn: string | null;
  baselineSourceId: string | null;
  baselineSourceType: "check_in" | "measurement" | "none";
  baselineStatus: BaselineStatus;
  baselineUnit: "cm" | "kg" | "percent" | "score" | null;
  baselineValue: string | null;
  cycleId: string;
  id: string;
  metricId: OutcomeMetricId;
  targetUnit: "cm" | "kg" | "percent" | "score";
  targetValue: string | null;
};

export class CycleGoalError extends Error {
  constructor(message: string, readonly code: "invalid" | "not_found") {
    super(message);
    this.name = "CycleGoalError";
  }
}

type CycleSummary = {
  id: string;
  name: string;
  ownerUserId: string;
  startDate: string;
  status: "active" | "cancelled" | "completed" | "paused";
};

function subtractDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function getOwnedCycle(
  sql: TransactionSql | ReturnType<typeof getPostgresClient>,
  actor: AuthenticatedActor,
  cycleId: string,
  lock = false,
) {
  const rows = lock
    ? await sql<CycleSummary[]>`
        select id, name, owner_user_id as "ownerUserId", start_date::text as "startDate", status
        from protocol_cycle where id = ${cycleId} for update
      `
    : await sql<CycleSummary[]>`
        select id, name, owner_user_id as "ownerUserId", start_date::text as "startDate", status
        from protocol_cycle where id = ${cycleId}
      `;
  if (!rows[0]) throw new CycleGoalError("Cycle not found.", "not_found");
  assertPrivateResourceAccess(actor, rows[0].ownerUserId, "read");
  return rows[0];
}

export async function resolveCycleBaseline(
  actor: AuthenticatedActor,
  cycleId: string,
  metricId: string,
) {
  const metric = getOutcomeMetric(metricId);
  if (!metric) throw new CycleGoalError("Choose a valid goal metric.", "invalid");
  const sql = getPostgresClient();
  const cycle = await getOwnedCycle(sql, actor, cycleId);
  return resolveBaseline(sql, actor.userId, cycle.startDate, metric.id);
}

async function resolveBaseline(
  sql: TransactionSql | ReturnType<typeof getPostgresClient>,
  ownerUserId: string,
  cycleStartDate: string,
  metricId: OutcomeMetricId,
) {
  const metric = getOutcomeMetric(metricId)!;
  const earliest = subtractDays(cycleStartDate, 7);
  if (metric.source === "measurement") {
    const [row] = await sql<{ observedOn: string; sourceId: string; value: string }[]>`
      select id as "sourceId", observed_on::text as "observedOn", canonical_value::text as value
      from health_measurement
      where owner_user_id = ${ownerUserId} and metric_id = ${metric.id}
        and observed_on between ${earliest} and (${cycleStartDate}::date - interval '1 day')
      order by observed_on desc, created_at desc, id desc limit 1
    `;
    if (!row) return { observedOn: null, sourceId: null, sourceType: "none" as const, status: "missing" as const, unit: null, value: null };
    const numericValue = Number(row.value);
    return { observedOn: row.observedOn, sourceId: row.sourceId, sourceType: "measurement" as const, status: classifyBaselineValue(numericValue), unit: metric.unit, value: numericValue };
  }

  const [row] = await sql<{ observedOn: string; sourceId: string; value: number }[]>`
    select check_in.id as "sourceId", check_in.check_in_date::text as "observedOn", answer.score as value
    from daily_check_in check_in
    join daily_check_in_answer answer on answer.check_in_id = check_in.id
    where check_in.owner_user_id = ${ownerUserId} and answer.question_id = ${metric.id}
      and check_in.check_in_date between ${earliest} and (${cycleStartDate}::date - interval '1 day')
    order by check_in.check_in_date desc, answer.updated_at desc, check_in.id desc limit 1
  `;
  if (!row) return { observedOn: null, sourceId: null, sourceType: "none" as const, status: "missing" as const, unit: null, value: null };
  return { observedOn: row.observedOn, sourceId: row.sourceId, sourceType: "check_in" as const, status: classifyBaselineValue(row.value), unit: "score" as const, value: row.value };
}

function validateInputs(inputs: CycleGoalInput[]) {
  const seen = new Set<string>();
  return inputs.map((input) => {
    if (!isOutcomeMetricId(input.metricId) || seen.has(input.metricId)) {
      throw new CycleGoalError("Choose each valid goal metric once.", "invalid");
    }
    seen.add(input.metricId);
    const metric = getOutcomeMetric(input.metricId)!;
    const raw = input.targetValue?.trim() ?? "";
    if (!raw) return { metric, targetValue: null };
    const targetValue = Number(raw);
    if (!Number.isFinite(targetValue) || targetValue < metric.min || targetValue > metric.max) {
      throw new CycleGoalError(`${metric.label} goal must be between ${metric.min} and ${metric.max} ${metric.unit}.`, "invalid");
    }
    if (metric.wholeNumber && !Number.isInteger(targetValue)) {
      throw new CycleGoalError(`${metric.label} goal must be a whole-number score.`, "invalid");
    }
    return { metric, targetValue };
  });
}

export async function saveCycleGoals(actor: AuthenticatedActor, cycleId: string, inputs: CycleGoalInput[]) {
  const values = validateInputs(inputs);
  const sql = getPostgresClient();
  return sql.begin(async (tx) => {
    const cycle = await getOwnedCycle(tx, actor, cycleId, true);
    if (cycle.status === "completed" || cycle.status === "cancelled") {
      throw new CycleGoalError("Goals for a completed or cancelled cycle are read-only.", "invalid");
    }
    const metricIds = values.map(({ metric }) => metric.id);
    if (metricIds.length) await tx`delete from protocol_cycle_goal where cycle_id = ${cycleId} and metric_id <> all(${metricIds})`;
    else await tx`delete from protocol_cycle_goal where cycle_id = ${cycleId}`;

    for (const { metric, targetValue } of values) {
      const baseline = await resolveBaseline(tx, actor.userId, cycle.startDate, metric.id);
      await tx`
        insert into protocol_cycle_goal (
          id, cycle_id, metric_id, target_value, target_unit, baseline_status,
          baseline_source_type, baseline_source_id, baseline_value, baseline_unit,
          baseline_observed_on
        ) values (
          ${crypto.randomUUID()}, ${cycleId}, ${metric.id}, ${targetValue}, ${metric.unit},
          ${baseline.status}, ${baseline.sourceType}, ${baseline.sourceId}, ${baseline.value},
          ${baseline.unit}, ${baseline.observedOn}
        )
        on conflict (cycle_id, metric_id) do update set
          target_value = excluded.target_value,
          target_unit = excluded.target_unit,
          baseline_status = excluded.baseline_status,
          baseline_source_type = excluded.baseline_source_type,
          baseline_source_id = excluded.baseline_source_id,
          baseline_value = excluded.baseline_value,
          baseline_unit = excluded.baseline_unit,
          baseline_observed_on = excluded.baseline_observed_on,
          updated_at = now()
      `;
    }
  });
}

export async function getCycleGoals(actor: AuthenticatedActor, cycleId: string) {
  const sql = getPostgresClient();
  const cycle = await getOwnedCycle(sql, actor, cycleId);
  const goals = await sql<CycleGoalRow[]>`
    select id, cycle_id as "cycleId", metric_id as "metricId",
      target_value::text as "targetValue", target_unit as "targetUnit",
      baseline_status as "baselineStatus", baseline_source_type as "baselineSourceType",
      baseline_source_id as "baselineSourceId", baseline_value::text as "baselineValue",
      baseline_unit as "baselineUnit", baseline_observed_on::text as "baselineObservedOn"
    from protocol_cycle_goal where cycle_id = ${cycleId} order by created_at, metric_id
  `;
  return { cycle, goals };
}

const categorySuggestions: Record<string, OutcomeMetricId[]> = {
  cognitive: ["focus", "stress", "sleep_quality"],
  growth_body_composition: ["waist_circumference", "body_fat_percentage", "muscle_mass", "recovery"],
  healing_skin_recovery: ["recovery", "pain_mobility", "sleep_quality"],
  metabolic_wellness: ["weight", "waist_circumference", "energy"],
  weight_management: ["weight", "waist_circumference", "appetite_control"],
};

export async function getSuggestedCycleGoalIds(actor: AuthenticatedActor, cycleId: string) {
  const sql = getPostgresClient();
  await getOwnedCycle(sql, actor, cycleId);
  const entries = await sql<{ category: string; id: string }[]>`
    select distinct catalogue.id, catalogue.category
    from protocol_cycle_schedule_revision revision
    join protocol_cycle_schedule_entry entry on entry.revision_id = revision.id
    join catalogue_entry catalogue on catalogue.id = entry.catalogue_entry_id
    where revision.cycle_id = ${cycleId}
  `;
  const suggested = new Set<OutcomeMetricId>();
  for (const entry of entries) for (const metricId of categorySuggestions[entry.category] ?? []) suggested.add(metricId);
  if (entries.some((entry) => entry.id === "catalogue-tesamorelin")) suggested.add("waist_circumference");
  return [...suggested];
}
