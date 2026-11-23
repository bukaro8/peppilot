import "server-only";

import type { TransactionSql } from "postgres";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { massInScaledMicrograms, parseApprovedDecimal } from "./decimal";
import { getApprovedProtocolPreset } from "./service";
import type { ApprovedIngredientDose, ApprovedProtocolDefinition, ApprovedScheduleStage } from "./types";

export class ApprovedProtocolError extends Error {}

const weekdayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

type ApprovedIngredientDoseInput = {
  doseAmount: string;
  doseUnit: "mg" | "mcg";
  name: string;
};

export type ApprovedStageCopyInput = {
  administrationsPerDay: number | null;
  doseAmount: string;
  doseUnit: "mg" | "mcg";
  endWeek: number | null;
  frequencyType: ApprovedScheduleStage["frequency"]["type"];
  include: boolean;
  ingredientDoses: ApprovedIngredientDoseInput[];
  intervalDays: number | null;
  route: string;
  sourceIndex?: number;
  startWeek: number;
  weekdays: string[];
};

export type ApprovedProtocolCopyInput = {
  description: string | null;
  durationDays: number | null;
  name: string;
  presetId: string;
  stages: ApprovedStageCopyInput[];
};

function divideDecimal(value: string, divisor: number) {
  const [whole, fraction = ""] = value.split(".");
  const scale = 4;
  const scaled = BigInt(whole) * BigInt(10) ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
  const quotient = (scaled + BigInt(Math.floor(divisor / 2))) / BigInt(divisor);
  const factor = BigInt(10) ** BigInt(scale);
  return `${quotient / factor}.${String(quotient % factor).padStart(scale, "0")}`.replace(/\.?0+$/, "");
}

function isWholeDay(value: number) {
  return Number.isFinite(value) && Math.abs(value - Math.round(value)) < 1e-8;
}

type ValidatedStage = Omit<ApprovedStageCopyInput, "ingredientDoses"> & {
  ingredientDoses: ApprovedIngredientDose[];
  originalIndex: number;
};

function validateInput(input: ApprovedProtocolCopyInput, definition: ApprovedProtocolDefinition) {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 100) throw new ApprovedProtocolError("Protocol name must be 3–100 characters.");
  if (input.stages.length < 1 || input.stages.length > 100) throw new ApprovedProtocolError("Add between 1 and 100 titration stages.");
  if (definition.duration_type === "fixed_cycle" && (!input.durationDays || !Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 3650)) throw new ApprovedProtocolError("Choose a fixed duration between 1 and 3,650 days.");
  const included = input.stages
    .map((stage, originalIndex) => ({ ...stage, originalIndex: stage.sourceIndex ?? originalIndex }))
    .filter((stage) => stage.include);
  if (!included.length) throw new ApprovedProtocolError("Keep at least one schedule stage.");
  const validatedStages: ValidatedStage[] = [];
  for (const [index, stage] of included.entries()) {
    const source = definition.schedule[stage.originalIndex];
    if (!source) throw new ApprovedProtocolError(`Stage ${index + 1} could not be matched to the approved source.`);
    const parentDose = parseApprovedDecimal(stage.doseAmount);
    if (parentDose === null || parentDose <= 0) throw new ApprovedProtocolError(`Stage ${index + 1} needs a positive dose with up to four decimal places.`);
    if (stage.doseUnit !== "mg" && stage.doseUnit !== "mcg") throw new ApprovedProtocolError(`Stage ${index + 1} has an invalid dose unit.`);
    if (!["daily", "days_per_week", "times_per_week", "interval", "as_needed"].includes(stage.frequencyType)) throw new ApprovedProtocolError(`Stage ${index + 1} has an invalid frequency.`);
    const startDay = (stage.startWeek - 1) * 7 + 1;
    const endDay = stage.endWeek === null ? null : stage.endWeek * 7;
    if (!Number.isFinite(stage.startWeek) || stage.startWeek < 1 || !isWholeDay(startDay) || (endDay !== null && (!isWholeDay(endDay) || endDay < startDay))) throw new ApprovedProtocolError(`Stage ${index + 1} has an invalid day range.`);
    if (!stage.route || stage.route === "not_reported" || stage.route === "injection_unspecified") throw new ApprovedProtocolError(`Choose a route for stage ${index + 1}.`);
    if (stage.frequencyType === "daily" && (!stage.administrationsPerDay || stage.administrationsPerDay < 1 || stage.administrationsPerDay > 12)) throw new ApprovedProtocolError(`Choose daily administrations for stage ${index + 1}.`);
    if (source.dose_basis === "combined_daily_mass" && (!stage.administrationsPerDay || stage.administrationsPerDay < 1 || stage.administrationsPerDay > 12)) throw new ApprovedProtocolError(`Choose daily administrations for stage ${index + 1}.`);
    if ((stage.frequencyType === "days_per_week" || stage.frequencyType === "times_per_week") && !stage.weekdays.length) throw new ApprovedProtocolError(`Choose administration days for stage ${index + 1}.`);
    const expectedWeekdays = (stage.frequencyType === "days_per_week" || stage.frequencyType === "times_per_week") && stage.frequencyType === source.frequency.type
      ? source.frequency.days_per_week ?? source.frequency.administrations_per_week
      : null;
    if (expectedWeekdays && stage.weekdays.length !== expectedWeekdays) throw new ApprovedProtocolError(`Stage ${index + 1} requires ${expectedWeekdays} selected administration days.`);
    if (stage.frequencyType === "interval" && (!stage.intervalDays || stage.intervalDays < 1)) throw new ApprovedProtocolError(`Choose an interval for stage ${index + 1}.`);
    if (stage.ingredientDoses.length !== source.ingredient_doses.length) throw new ApprovedProtocolError(`Stage ${index + 1} ingredient doses could not be matched to the approved source.`);
    const ingredientDoses = stage.ingredientDoses.map((ingredient, ingredientIndex) => {
      const sourceIngredient = source.ingredient_doses[ingredientIndex];
      const parsed = parseApprovedDecimal(ingredient.doseAmount);
      if (!sourceIngredient || parsed === null || parsed <= 0 || ingredient.name !== sourceIngredient.name || ingredient.doseUnit !== sourceIngredient.dose_unit) {
        throw new ApprovedProtocolError(`Stage ${index + 1} has an invalid ingredient dose.`);
      }
      return { ...sourceIngredient, dose_amount: Number(ingredient.doseAmount) };
    });
    if (source.dose_basis !== "single_compound_mass" && ingredientDoses.length) {
      const combinedMass = massInScaledMicrograms(stage.doseAmount, stage.doseUnit);
      const ingredientTotal = stage.ingredientDoses.reduce((total, ingredient) => {
        const mass = massInScaledMicrograms(ingredient.doseAmount, ingredient.doseUnit);
        return total + (mass ?? BigInt(0));
      }, BigInt(0));
      if (combinedMass === null || ingredientTotal !== combinedMass) throw new ApprovedProtocolError(`Stage ${index + 1} ingredient doses must equal the combined dose.`);
    }
    const usesWeekdays = stage.frequencyType === "days_per_week" || stage.frequencyType === "times_per_week";
    validatedStages.push({
      ...stage,
      ingredientDoses,
      intervalDays: stage.frequencyType === "interval" ? stage.intervalDays : null,
      originalIndex: stage.originalIndex,
      weekdays: usesWeekdays ? stage.weekdays : [],
    });
  }
  return { ...input, description: input.description?.trim() || null, name, stages: validatedStages };
}

async function insertContent(sql: TransactionSql, protocolId: string, catalogueEntryId: string, definition: ApprovedProtocolDefinition, stages: ValidatedStage[], durationDays: number | null) {
  const entryId = crypto.randomUUID();
  await sql`insert into member_protocol_entry (id, protocol_id, catalogue_entry_id, position) values (${entryId}, ${protocolId}, ${catalogueEntryId}, 1)`;
  for (const [index, stage] of stages.entries()) {
    const source = definition.schedule[stage.originalIndex];
    const administrations = stage.administrationsPerDay ?? source.frequency.administrations_per_day ?? 1;
    const eventDose = source.dose_basis === "combined_daily_mass" ? divideDecimal(stage.doseAmount, administrations) : stage.doseAmount;
    const frequency = stage.frequencyType === "interval" ? "interval_days" : stage.frequencyType === "as_needed" ? "as_needed" : stage.frequencyType === "daily" ? "daily" : "weekly";
    const days = stage.weekdays.map((day) => weekdayMap[day]).filter((day) => day !== undefined);
    const startDay = Math.round((stage.startWeek - 1) * 7) + 1;
    const endDay = stage.endWeek === null
      ? durationDays
      : Math.min(Math.round(stage.endWeek * 7), durationDays ?? Math.round(stage.endWeek * 7));
    await sql`
      insert into member_protocol_schedule_step (
        id, protocol_entry_id, dose_amount, dose_unit, frequency, days_of_week,
        interval_days, time_of_day, times_of_day, administrations_per_day,
        dose_basis, ingredient_doses, route, start_day, end_day, position
      ) values (
        ${crypto.randomUUID()}, ${entryId}, ${eventDose}, ${stage.doseUnit}, ${frequency},
        ${days}, ${stage.intervalDays}, null, ${source.frequency.time_of_day}, ${administrations},
        ${source.dose_basis}, ${JSON.stringify(stage.ingredientDoses)}::jsonb, ${stage.route},
        ${startDay}, ${endDay}, ${index + 1}
      )
    `;
  }
}

export async function createApprovedProtocolCopy(actor: AuthenticatedActor, raw: ApprovedProtocolCopyInput) {
  const preset = await getApprovedProtocolPreset(raw.presetId);
  if (!preset) throw new ApprovedProtocolError("Approved protocol not found.");
  const input = validateInput(raw, preset.definition);
  const definition = structuredClone(preset.definition);
  definition.duration_days = definition.duration_type === "fixed_cycle" ? input.durationDays : null;
  definition.schedule = input.stages.map((stage) => {
    const original = structuredClone(preset.definition.schedule[stage.originalIndex]);
    original.dose_amount = Number(stage.doseAmount);
    original.dose_unit = stage.doseUnit;
    original.start_week = stage.startWeek;
    original.end_week = stage.endWeek;
    original.route = stage.route;
    original.ingredient_doses = stage.ingredientDoses;
    original.frequency.type = stage.frequencyType;
    original.frequency.administrations_per_day = stage.administrationsPerDay;
    original.frequency.interval_days = stage.intervalDays;
    original.frequency.weekdays = stage.weekdays;
    return original;
  });
  const protocolId = crypto.randomUUID();
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    await transaction`
      insert into member_protocol (
        id, owner_user_id, name, description, duration_days, duration_type, origin,
        source_approved_preset_id, approved_definition, template_schedule_unchanged
      ) values (
        ${protocolId}, ${actor.userId}, ${input.name}, ${input.description}, ${input.durationDays},
        ${preset.durationType}, 'approved_preset', ${preset.id}, ${JSON.stringify(definition)}::jsonb, false
      )
    `;
    await insertContent(transaction, protocolId, preset.catalogueEntryId, definition, input.stages, input.durationDays);
  });
  return { protocolId };
}
