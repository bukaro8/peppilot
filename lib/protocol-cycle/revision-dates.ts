export function revisionDateBounds(input: {
  startDate: string;
  plannedEndDate: string | null;
  latestEffectiveFrom: string;
  lastInterruptionDate?: string | null;
}) {
  const next = new Date(`${input.latestEffectiveFrom}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const minimumDate = [input.startDate, next.toISOString().slice(0, 10), input.lastInterruptionDate ?? ""].sort().at(-1)!;
  const maximumDate = input.plannedEndDate;
  return { minimumDate, maximumDate, available: maximumDate === null || minimumDate <= maximumDate };
}
