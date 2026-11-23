import { describe, expect, it } from "vitest";

import {
  calendarMonthRange,
  generateScheduledEvents,
  startOfCalendarWeek,
} from "@/lib/protocol-calendar/service";
import type { CycleScheduleRangeSnapshot } from "@/lib/protocol-cycle/service";

const snapshot: CycleScheduleRangeSnapshot = {
  cycles: [
    { endedOn: null, id: "cycle-a", name: "Cycle A", plannedEndDate: "2026-01-31", startDate: "2026-01-01", status: "active" },
    { endedOn: null, id: "cycle-b", name: "Cycle B", plannedEndDate: "2026-01-12", startDate: "2026-01-05", status: "paused" },
  ],
  pauses: [{ cycleId: "cycle-a", pausedOn: "2026-01-05", resumedOn: "2026-01-07" }],
  revisions: [
    {
      cycleId: "cycle-a", effectiveFrom: "2026-01-01", id: "revision-a1", revisionNumber: 1,
      steps: [
        { catalogueEntryId: "a", daysOfWeek: [], displayName: "Alpha", doseAmount: "1.0000", doseUnit: "mg", endDay: 31, frequency: "daily", id: "step-a1", intervalDays: null, startDay: 1, timeOfDay: "08:00" },
        { catalogueEntryId: "b", daysOfWeek: [], displayName: "Beta", doseAmount: "0.5000", doseUnit: "mg", endDay: 31, frequency: "interval_days", id: "step-a2", intervalDays: 3, startDay: 2, timeOfDay: null },
      ],
    },
    {
      cycleId: "cycle-a", effectiveFrom: "2026-01-08", id: "revision-a2", revisionNumber: 2,
      steps: [{ catalogueEntryId: "a", daysOfWeek: [], displayName: "Alpha", doseAmount: "2.0000", doseUnit: "mg", endDay: 31, frequency: "daily", id: "step-a3", intervalDays: null, startDay: 1, timeOfDay: "09:00" }],
    },
    {
      cycleId: "cycle-b", effectiveFrom: "2026-01-05", id: "revision-b1", revisionNumber: 1,
      steps: [{ catalogueEntryId: "c", daysOfWeek: [1, 3], displayName: "Gamma", doseAmount: "250.0000", doseUnit: "mcg", endDay: 8, frequency: "weekly", id: "step-b1", intervalDays: null, startDay: 1, timeOfDay: "18:00" }],
    },
  ],
};

describe("protocol calendar projections", () => {
  it("generates daily events with overlaps, pause boundaries and revisions", () => {
    expect(generateScheduledEvents(snapshot, "2026-01-05", "2026-01-05").map((event) => event.peptideName)).toEqual(["Gamma"]);
    expect(generateScheduledEvents(snapshot, "2026-01-06", "2026-01-06")).toEqual([]);
    const overlapping = generateScheduledEvents(snapshot, "2026-01-07", "2026-01-07");
    expect(overlapping.map((event) => event.peptideName)).toEqual(["Alpha", "Gamma"]);
    expect(overlapping.map((event) => event.cycleId)).toEqual(["cycle-a", "cycle-b"]);
    expect(generateScheduledEvents(snapshot, "2026-01-08", "2026-01-08")[0]).toMatchObject({ doseAmount: "2.0000", timeOfDay: "09:00" });
  });

  it("respects cycle and step boundaries for weekly and monthly ranges", () => {
    const week = generateScheduledEvents(snapshot, "2026-01-01", "2026-01-07");
    expect(week.every((event) => event.date >= "2026-01-01" && event.date <= "2026-01-07")).toBe(true);
    expect(generateScheduledEvents(snapshot, "2026-02-01", "2026-02-28")).toEqual([]);
    expect(calendarMonthRange("2026-02-18")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("anchors the initial schedule revision to a backdated cycle start", () => {
    const backdated: CycleScheduleRangeSnapshot = {
      cycles: [{ endedOn: null, id: "backdated", name: "Backdated", plannedEndDate: "2027-01-10", startDate: "2026-11-16", status: "active" }],
      pauses: [],
      revisions: [{
        cycleId: "backdated", effectiveFrom: "2026-11-23", id: "backdated-r1", revisionNumber: 1,
        steps: [{ catalogueEntryId: "glow", daysOfWeek: [], displayName: "GLOW", doseAmount: "2.8", doseUnit: "mg", endDay: 56, frequency: "daily", id: "backdated-s1", intervalDays: null, startDay: 1, timeOfDay: null }],
      }],
    };

    expect(generateScheduledEvents(backdated, "2026-11-16", "2026-11-22").map((event) => event.date)).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
  });

  it("uses UTC date arithmetic so local timezone offsets cannot move schedule days", () => {
    expect(startOfCalendarWeek("2026-01-01")).toBe("2025-12-29");
    const wednesday = generateScheduledEvents(snapshot, "2026-01-07", "2026-01-07");
    expect(wednesday.some((event) => event.peptideName === "Gamma")).toBe(true);
  });

  it("continues open-ended final stages and creates distinct same-day administrations", () => {
    const open: CycleScheduleRangeSnapshot = {
      cycles: [{ endedOn: null, id: "open", name: "Open", plannedEndDate: null, startDate: "2026-01-01", status: "active" }],
      pauses: [],
      revisions: [{
        cycleId: "open", effectiveFrom: "2026-01-01", id: "open-revision", revisionNumber: 1,
        steps: [{ catalogueEntryId: "a", daysOfWeek: [], displayName: "Alpha", doseAmount: "100.0000", doseUnit: "mcg", endDay: null, frequency: "daily", id: "open-step", intervalDays: null, startDay: 29, timeOfDay: null, administrationsPerDay: 2, timesOfDay: ["morning", "evening"] }],
      }],
    };
    expect(generateScheduledEvents(open, "2026-02-01", "2026-02-01")).toHaveLength(2);
    expect(new Set(generateScheduledEvents(open, "2026-02-01", "2026-02-01").map((event) => event.id)).size).toBe(2);
  });

  it("does not invent recurring events for as-needed schedules", () => {
    const asNeeded: CycleScheduleRangeSnapshot = {
      cycles: [{ endedOn: null, id: "prn", name: "PRN", plannedEndDate: null, startDate: "2026-01-01", status: "active" }],
      pauses: [],
      revisions: [{ cycleId: "prn", effectiveFrom: "2026-01-01", id: "prn-r", revisionNumber: 1, steps: [{ catalogueEntryId: "pt", daysOfWeek: [], displayName: "PT-141", doseAmount: "1", doseUnit: "mg", endDay: null, frequency: "as_needed", id: "prn-s", intervalDays: null, startDay: 1, timeOfDay: null }] }],
    };
    expect(generateScheduledEvents(asNeeded, "2026-01-01", "2026-01-31")).toEqual([]);
  });
});
