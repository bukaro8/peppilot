import "server-only";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import {
  getCycleScheduleDataForRange,
  ProtocolCycleError,
  type CycleScheduleRangeSnapshot,
} from "@/lib/protocol-cycle/service";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayMilliseconds = 86_400_000;

export type ScheduledProtocolEvent = {
  catalogueEntryId: string;
  cycleId: string;
  cycleName: string;
  date: string;
  doseAmount: string;
  doseUnit: string;
  id: string;
  peptideName: string;
  revisionId: string;
  scheduleStepId: string;
  timeOfDay: string | null;
};

export function parseCalendarDate(value: string) {
  if (!isoDatePattern.test(value)) {
    throw new ProtocolCycleError("Calendar date must use YYYY-MM-DD format.", "invalid");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new ProtocolCycleError("Calendar date must be valid.", "invalid");
  }
  return date;
}

export function addCalendarDays(value: string, days: number) {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calendarDayDifference(start: string, end: string) {
  return Math.floor((parseCalendarDate(end).valueOf() - parseCalendarDate(start).valueOf()) / dayMilliseconds);
}

export function startOfCalendarWeek(value: string) {
  const date = parseCalendarDate(value);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addCalendarDays(value, -mondayOffset);
}

export function calendarMonthRange(value: string) {
  const date = parseCalendarDate(value);
  const start = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const end = new Date(next.valueOf() - dayMilliseconds).toISOString().slice(0, 10);
  return { start, end };
}

export function enumerateCalendarDates(startDate: string, endDate: string) {
  const length = calendarDayDifference(startDate, endDate);
  if (length < 0) throw new ProtocolCycleError("Calendar range is invalid.", "invalid");
  return Array.from({ length: length + 1 }, (_, index) => addCalendarDays(startDate, index));
}

function isPausedOnDate(
  pauses: CycleScheduleRangeSnapshot["pauses"],
  cycleId: string,
  date: string,
) {
  return pauses.some(
    (pause) =>
      pause.cycleId === cycleId &&
      date >= pause.pausedOn &&
      (pause.resumedOn === null || date < pause.resumedOn),
  );
}

function stepOccursOnDate(
  step: CycleScheduleRangeSnapshot["revisions"][number]["steps"][number],
  cycleStartDate: string,
  date: string,
) {
  const cycleDay = calendarDayDifference(cycleStartDate, date) + 1;
  if (cycleDay < step.startDay || cycleDay > step.endDay) return false;
  if (step.frequency === "daily") return true;
  if (step.frequency === "weekly") return step.daysOfWeek.includes(parseCalendarDate(date).getUTCDay());
  return step.intervalDays !== null && (cycleDay - step.startDay) % step.intervalDays === 0;
}

export function generateScheduledEvents(
  snapshot: CycleScheduleRangeSnapshot,
  startDate: string,
  endDate: string,
): ScheduledProtocolEvent[] {
  const dates = enumerateCalendarDates(startDate, endDate);
  const revisionsByCycle = new Map<string, CycleScheduleRangeSnapshot["revisions"]>();
  for (const revision of snapshot.revisions) {
    const revisions = revisionsByCycle.get(revision.cycleId) ?? [];
    revisions.push(revision);
    revisionsByCycle.set(revision.cycleId, revisions);
  }

  const events: ScheduledProtocolEvent[] = [];
  for (const cycle of snapshot.cycles) {
    const revisions = revisionsByCycle.get(cycle.id) ?? [];
    for (const date of dates) {
      const cycleEndDate = cycle.endedOn && cycle.endedOn < cycle.plannedEndDate
        ? cycle.endedOn
        : cycle.plannedEndDate;
      if (date < cycle.startDate || date > cycleEndDate) continue;
      if (isPausedOnDate(snapshot.pauses, cycle.id, date)) continue;
      const revision = revisions
        .filter((candidate) => candidate.effectiveFrom <= date)
        .at(-1);
      if (!revision) continue;
      for (const step of revision.steps) {
        if (!stepOccursOnDate(step, cycle.startDate, date)) continue;
        events.push({
          catalogueEntryId: step.catalogueEntryId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          date,
          doseAmount: step.doseAmount,
          doseUnit: step.doseUnit,
          id: `${revision.id}:${step.id}:${date}`,
          peptideName: step.displayName,
          revisionId: revision.id,
          scheduleStepId: step.id,
          timeOfDay: step.timeOfDay,
        });
      }
    }
  }

  return events.sort((left, right) =>
    left.date.localeCompare(right.date) ||
    (left.timeOfDay ?? "99:99").localeCompare(right.timeOfDay ?? "99:99") ||
    left.peptideName.localeCompare(right.peptideName),
  );
}

export async function getScheduledEvents(
  actor: AuthenticatedActor,
  startDate: string,
  endDate: string,
  options: { includeCompleted?: boolean } = {},
) {
  const snapshot = await getCycleScheduleDataForRange(actor, startDate, endDate, options);
  return generateScheduledEvents(snapshot, startDate, endDate);
}

export function getDailySchedule(actor: AuthenticatedActor, date: string) {
  return getScheduledEvents(actor, date, date);
}

export function getWeeklySchedule(actor: AuthenticatedActor, date: string) {
  const start = startOfCalendarWeek(date);
  const end = addCalendarDays(start, 6);
  return getScheduledEvents(actor, start, end);
}

export function getMonthlySchedule(actor: AuthenticatedActor, date: string) {
  const { start, end } = calendarMonthRange(date);
  return getScheduledEvents(actor, start, end);
}
