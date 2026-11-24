import { massInScaledMicrograms } from "@/lib/approved-protocol/decimal";

export const protocolTemplateFrequencies = ["daily", "weekly", "interval_days", "as_needed"] as const;

export type ProtocolTemplateFrequency = (typeof protocolTemplateFrequencies)[number];

export type ProtocolTemplateScheduleInput = {
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseUnit: string;
  endDay: number | null;
  frequency: ProtocolTemplateFrequency;
  intervalDays: number | null;
  startDay: number;
  timeOfDay: string | null;
  administrationsPerDay?: number;
  doseBasis?: string;
  ingredientDoses?: unknown[];
  route?: string | null;
  timesOfDay?: string[];
};

export type ProtocolTemplateInput = {
  description: string | null;
  durationDays: number;
  name: string;
  schedules: ProtocolTemplateScheduleInput[];
};

export type CreateProtocolTemplateInput = ProtocolTemplateInput & { slug: string };

export type ProtocolTemplateValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dosePattern = /^\d{1,8}(?:\.\d{1,4})?$/;
const unitPattern = /^[A-Za-zµ]+$/u;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function integerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function validateProtocolTemplateInput(
  input: CreateProtocolTemplateInput,
): ProtocolTemplateValidationResult<CreateProtocolTemplateInput> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const description = input.description?.trim() || null;

  if (name.length < 3 || name.length > 100) {
    return { success: false, error: "Template name must be 3–100 characters." };
  }
  if (!slugPattern.test(slug) || slug.length > 100) {
    return { success: false, error: "Slug must use lowercase letters, numbers, and hyphens." };
  }
  if (description && description.length > 1000) {
    return { success: false, error: "Description must be 1,000 characters or fewer." };
  }
  if (!integerInRange(input.durationDays, 1, 3650)) {
    return { success: false, error: "Duration must be between 1 and 3,650 days." };
  }
  if (input.schedules.length === 0 || input.schedules.length > 100) {
    return { success: false, error: "Add between 1 and 100 schedule steps." };
  }

  const schedules: ProtocolTemplateScheduleInput[] = [];
  for (const [index, schedule] of input.schedules.entries()) {
    const label = `Schedule ${index + 1}`;
    const doseAmount = schedule.doseAmount.trim();
    const doseUnit = schedule.doseUnit.trim();

    if (!schedule.catalogueEntryId) {
      return { success: false, error: `${label} must select a catalogue entry.` };
    }
    if (!dosePattern.test(doseAmount) || Number(doseAmount) <= 0) {
      return { success: false, error: `${label} must have a positive dose with up to 4 decimal places.` };
    }
    if (!unitPattern.test(doseUnit) || doseUnit.length > 20) {
      return { success: false, error: `${label} must have a valid unit of 20 letters or fewer.` };
    }
    if (!protocolTemplateFrequencies.includes(schedule.frequency)) {
      return { success: false, error: `${label} has an unsupported frequency.` };
    }
    if (!integerInRange(schedule.startDay, 1, input.durationDays)) {
      return { success: false, error: `${label} start day must be within the template duration.` };
    }
    if (schedule.endDay === null || !integerInRange(schedule.endDay, schedule.startDay, input.durationDays)) {
      return { success: false, error: `${label} end day must follow its start day and remain within the duration.` };
    }
    if (schedule.timeOfDay && !timePattern.test(schedule.timeOfDay)) {
      return { success: false, error: `${label} time must use 24-hour HH:MM format.` };
    }

    const daysOfWeek = [...new Set(schedule.daysOfWeek)].sort((a, b) => a - b);
    if (schedule.frequency === "weekly") {
      if (daysOfWeek.length === 0 || daysOfWeek.some((day) => !integerInRange(day, 0, 6))) {
        return { success: false, error: `${label} must choose at least one weekday from 0–6.` };
      }
    } else if (daysOfWeek.length > 0) {
      return { success: false, error: `${label} can use weekdays only with weekly frequency.` };
    }

    if (
      schedule.frequency === "interval_days" &&
      (schedule.intervalDays === null || !integerInRange(schedule.intervalDays, 1, 3650))
    ) {
      return { success: false, error: `${label} must have an interval between 1 and 3,650 days.` };
    }
    if (schedule.frequency !== "interval_days" && schedule.intervalDays !== null) {
      return { success: false, error: `${label} can use an interval only with interval frequency.` };
    }

    const ingredients = schedule.ingredientDoses ?? [];
    if (!Array.isArray(ingredients) || ingredients.length > 20) return { success: false, error: `${label} has invalid ingredients.` };
    let total = BigInt(0);
    for (const ingredient of ingredients) {
      if (!ingredient || typeof ingredient !== "object" || !("name" in ingredient) || !("dose_amount" in ingredient) || !("dose_unit" in ingredient) || typeof ingredient.name !== "string" || !ingredient.name.trim() || ingredient.name.length > 100 || !["mg", "mcg"].includes(String(ingredient.dose_unit))) return { success: false, error: `${label} needs ingredient names, masses and units.` };
      const mass = massInScaledMicrograms(String(ingredient.dose_amount), ingredient.dose_unit as "mg" | "mcg");
      if (mass === null || mass <= BigInt(0)) return { success: false, error: `${label} needs positive ingredient masses.` };
      total += mass;
    }
    if (schedule.doseBasis === "combined_blend_mass" && ingredients.length) {
      if (total !== massInScaledMicrograms(doseAmount, doseUnit as "mg" | "mcg")) return { success: false, error: `${label} ingredient masses must equal the combined dose.` };
    }
    schedules.push({
      ...schedule,
      daysOfWeek,
      doseAmount,
      doseUnit,
      timeOfDay: schedule.timeOfDay || null,
    });
  }

  return {
    success: true,
    value: { description, durationDays: input.durationDays, name, schedules, slug },
  };
}

export function validateProtocolTemplateContent(
  input: ProtocolTemplateInput,
): ProtocolTemplateValidationResult<ProtocolTemplateInput> {
  const result = validateProtocolTemplateInput({ ...input, slug: "template-content" });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    value: {
      description: result.value.description,
      durationDays: result.value.durationDays,
      name: result.value.name,
      schedules: result.value.schedules,
    },
  };
}
