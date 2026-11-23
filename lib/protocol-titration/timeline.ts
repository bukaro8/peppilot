import {
  massInScaledMicrograms,
  parseApprovedDecimal,
} from "@/lib/approved-protocol/decimal";

export type StageDuration = { duration: number; unit: "days" | "weeks" };

export function calculateTimelineRanges(
  stages: StageDuration[],
  finalOngoing = false,
) {
  let startDay = 1;
  return stages.map((stage, index) => {
    const days = stage.duration * (stage.unit === "weeks" ? 7 : 1);
    if (!Number.isInteger(days) || days < 1)
      throw new Error("Stage durations must resolve to whole positive days.");
    const endDay =
      finalOngoing && index === stages.length - 1 ? null : startDay + days - 1;
    const range = { endDay, startDay };
    startDay += days;
    return range;
  });
}

export function formatTimelineRange(
  startDay: number,
  endDay: number | null,
  unit: "days" | "weeks",
) {
  if (unit === "days")
    return endDay === null
      ? `Day ${startDay} onward`
      : startDay === endDay
        ? `Day ${startDay}`
        : `Days ${startDay}–${endDay}`;
  const startWeek = Math.floor((startDay - 1) / 7) + 1;
  if (endDay === null) return `Week ${startWeek} onward`;
  const endWeek = Math.ceil(endDay / 7);
  return startWeek === endWeek
    ? `Week ${startWeek}`
    : `Weeks ${startWeek}–${endWeek}`;
}

export function moveTimelineStage<T>(items: T[], from: number, to: number) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  )
    return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function convertMassUnit(
  value: string,
  from: "mg" | "mcg",
  to: "mg" | "mcg",
) {
  if (from === to) return value;
  const mass = massInScaledMicrograms(value, from);
  return mass === null ? value : scaledMassToUnit(mass, to);
}

function scaledMassToUnit(value: bigint, unit: "mg" | "mcg") {
  const scaled = unit === "mg" ? (value + BigInt(500)) / BigInt(1_000) : value;
  const factor = BigInt(10_000);
  return `${scaled / factor}.${String(scaled % factor).padStart(4, "0")}`.replace(
    /\.?0+$/,
    "",
  );
}

export function scaleBlendIngredients(
  combinedDose: string,
  combinedUnit: "mg" | "mcg",
  ingredients: Array<{
    doseAmount: string;
    doseUnit: "mg" | "mcg";
    name: string;
  }>,
) {
  const target = massInScaledMicrograms(combinedDose, combinedUnit);
  const sourceMasses = ingredients.map((ingredient) =>
    massInScaledMicrograms(ingredient.doseAmount, ingredient.doseUnit),
  );
  if (
    target === null ||
    parseApprovedDecimal(combinedDose) === null ||
    sourceMasses.some((mass) => mass === null)
  )
    return null;
  const masses = sourceMasses as bigint[];
  const total = masses.reduce((sum, mass) => sum + mass, BigInt(0));
  if (total <= 0) return null;
  let allocated = BigInt(0);
  return ingredients.map((ingredient, index) => {
    const mass =
      index === ingredients.length - 1
        ? target - allocated
        : (target * masses[index] + total / BigInt(2)) / total;
    allocated += mass;
    return {
      ...ingredient,
      doseAmount: scaledMassToUnit(mass, ingredient.doseUnit),
    };
  });
}
