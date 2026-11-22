export function formatTemplateFrequency(
  frequency: "as_needed" | "daily" | "weekly" | "interval_days",
  daysOfWeek: number[],
  intervalDays: number | null,
) {
  if (frequency === "daily") return "Daily";
  if (frequency === "as_needed") return "As needed";
  if (frequency === "interval_days") return `Every ${intervalDays} days`;

  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return daysOfWeek.map((day) => labels[day]).filter(Boolean).join(", ");
}

export function formatDoseAmount(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
