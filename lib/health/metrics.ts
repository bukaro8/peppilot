export const healthMetrics = [
  { id: "weight", label: "Weight", canonicalUnit: "kg", units: ["kg", "lb"], min: 20, max: 500 },
  { id: "waist_circumference", label: "Waist circumference", canonicalUnit: "cm", units: ["cm", "in"], min: 30, max: 300 },
  { id: "body_fat_percentage", label: "Body fat percentage", canonicalUnit: "percent", units: ["percent"], min: 1, max: 75 },
  { id: "muscle_mass", label: "Muscle mass", canonicalUnit: "kg", units: ["kg", "lb"], min: 5, max: 250 },
  { id: "hip_circumference", label: "Hip circumference", canonicalUnit: "cm", units: ["cm", "in"], min: 30, max: 300 },
  { id: "chest_circumference", label: "Chest circumference", canonicalUnit: "cm", units: ["cm", "in"], min: 30, max: 300 },
] as const;

export type HealthMetricId = (typeof healthMetrics)[number]["id"];
export type HealthMeasurementUnit = "cm" | "in" | "kg" | "lb" | "percent";

const metricsById = new Map(healthMetrics.map((metric) => [metric.id, metric]));

export function isHealthMetricId(value: string): value is HealthMetricId {
  return metricsById.has(value as HealthMetricId);
}

export function getHealthMetric(metricId: string) {
  return isHealthMetricId(metricId) ? metricsById.get(metricId)! : null;
}

export function convertToCanonical(metricId: HealthMetricId, value: number, unit: string) {
  const metric = getHealthMetric(metricId)!;
  if (!(metric.units as readonly string[]).includes(unit)) throw new Error("Choose a valid unit for this metric.");
  if (!Number.isFinite(value)) throw new Error("Enter a valid measurement value.");
  let canonical = value;
  if (unit === "lb") canonical = value * 0.45359237;
  if (unit === "in") canonical = value * 2.54;
  const rounded = Math.round(canonical * 10_000) / 10_000;
  if (rounded < metric.min || rounded > metric.max) {
    throw new Error(`${metric.label} must be between ${metric.min} and ${metric.max} ${metric.canonicalUnit}.`);
  }
  return { canonicalUnit: metric.canonicalUnit, canonicalValue: rounded };
}

export function formatMeasurementValue(value: string, unit: string) {
  return `${value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")} ${unit === "percent" ? "%" : unit}`;
}
