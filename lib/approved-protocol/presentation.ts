import type { ApprovedFrequency, ApprovedProtocolDefinition, ApprovedScheduleStage } from "./types";

const weekdayLabel: Record<string, string> = {
  sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat",
};

export function formatApprovedFrequency(frequency: ApprovedFrequency) {
  if (frequency.type === "as_needed") return "As needed";
  if (frequency.type === "interval") return `Every ${frequency.interval_days} days`;
  if (frequency.weekdays.length) {
    return frequency.weekdays.map((day) => weekdayLabel[day] ?? day).join(", ");
  }
  if (frequency.type === "days_per_week") return `${frequency.days_per_week} days per week`;
  if (frequency.type === "times_per_week") return `${frequency.administrations_per_week} times per week`;
  const count = frequency.administrations_per_day ?? 1;
  return count === 1 ? "Daily" : `${count} administrations daily`;
}

export function formatApprovedDuration(definition: ApprovedProtocolDefinition) {
  if (definition.duration_type === "open_ended") return "Open-ended";
  if (definition.duration_type === "as_needed") return "As needed";
  if (definition.duration_days) return `${definition.duration_days} days`;
  return `${definition.duration_weeks} weeks`;
}

export function formatApprovedStageRange(stage: ApprovedScheduleStage) {
  if (stage.end_week === null) return `Week ${stage.start_week} onward`;
  const usesWholeWeeks = Number.isInteger(stage.start_week) && Number.isInteger(stage.end_week);
  if (usesWholeWeeks) {
    return stage.start_week === stage.end_week
      ? `Week ${stage.start_week}`
      : `Weeks ${stage.start_week}–${stage.end_week}`;
  }
  const startDay = Math.round((stage.start_week - 1) * 7) + 1;
  const endDay = Math.round(stage.end_week * 7);
  return startDay === endDay ? `Day ${startDay}` : `Days ${startDay}–${endDay}`;
}

export function formatCategory(category: string) {
  if (category === "most_used") return "Most Used";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
