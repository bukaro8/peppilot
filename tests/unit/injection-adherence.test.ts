import { describe, expect, it } from "vitest";

import { calculateAdherence } from "@/lib/injection/service";
import type { ScheduledProtocolEvent } from "@/lib/protocol-calendar/service";

function event(id: string, date: string, timeOfDay: string | null): ScheduledProtocolEvent {
  return {
    catalogueEntryId: "catalogue-semax",
    cycleId: "cycle-a",
    cycleName: "Cycle A",
    date,
    doseAmount: "0.5000",
    doseUnit: "mg",
    id,
    peptideName: "Semax",
    revisionId: "revision-a",
    scheduleStepId: `step-${id}`,
    timeOfDay,
  };
}

describe("cycle adherence", () => {
  const events = [
    event("completed", "2026-04-01", "08:00"),
    event("skipped", "2026-04-01", "12:00"),
    event("missed", "2026-04-01", null),
    event("overdue", "2026-04-01", "18:00"),
    event("today-past", "2026-04-02", "08:00"),
    event("today-future", "2026-04-02", "18:00"),
    event("future", "2026-04-03", "08:00"),
  ];

  it("counts completed, skipped, missed and overdue due occurrences", () => {
    expect(calculateAdherence(events, [
      { scheduledOccurrenceId: "completed", status: "completed" },
      { scheduledOccurrenceId: "skipped", status: "skipped" },
      { scheduledOccurrenceId: "missed", status: "missed" },
    ], "2026-04-02", "09:00")).toEqual({
      completed: 1,
      missed: 1,
      overdue: 2,
      percentage: 20,
      scheduled: 5,
      skipped: 1,
    });
  });

  it("does not prematurely count future or un-timed occurrences today", () => {
    const result = calculateAdherence(events, [], "2026-04-02", "09:00");
    expect(result.scheduled).toBe(5);
    expect(result.overdue).toBe(5);
    expect(result.percentage).toBe(0);
  });

  it("includes a resolved occurrence today even before its planned time", () => {
    const result = calculateAdherence(events, [
      { scheduledOccurrenceId: "today-future", status: "completed" },
    ], "2026-04-02", "09:00");
    expect(result.scheduled).toBe(6);
    expect(result.completed).toBe(1);
  });

  it("returns no percentage when nothing is due", () => {
    expect(calculateAdherence(events, [], "2026-03-31", null).percentage).toBeNull();
  });
});
