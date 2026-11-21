import { checkInQuestions, type CheckInQuestionId } from "@/lib/health/check-in-questions";
import { healthMetrics, type HealthMetricId } from "@/lib/health/metrics";

export type OutcomeMetricId = HealthMetricId | CheckInQuestionId;
export type OutcomeMetricSource = "check_in" | "measurement";

export type OutcomeMetricDefinition = {
  id: OutcomeMetricId;
  label: string;
  max: number;
  min: number;
  source: OutcomeMetricSource;
  unit: "cm" | "kg" | "percent" | "score";
  wholeNumber: boolean;
};

export const outcomeMetrics: OutcomeMetricDefinition[] = [
  ...healthMetrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    max: metric.max,
    min: metric.min,
    source: "measurement" as const,
    unit: metric.canonicalUnit,
    wholeNumber: false,
  })),
  ...checkInQuestions.map((question) => ({
    id: question.id,
    label: question.label,
    max: 10,
    min: 1,
    source: "check_in" as const,
    unit: "score" as const,
    wholeNumber: true,
  })),
];

const outcomeMetricsById = new Map(outcomeMetrics.map((metric) => [metric.id, metric]));

export function isOutcomeMetricId(value: string): value is OutcomeMetricId {
  return outcomeMetricsById.has(value as OutcomeMetricId);
}

export function getOutcomeMetric(value: string) {
  return isOutcomeMetricId(value) ? outcomeMetricsById.get(value)! : null;
}

export function classifyBaselineValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "missing" as const;
  if (!Number.isFinite(value) || value <= 0) return "unsuitable" as const;
  return "valid" as const;
}

export function formatOutcomeUnit(unit: OutcomeMetricDefinition["unit"]) {
  if (unit === "percent") return "%";
  if (unit === "score") return "/10";
  return unit;
}
