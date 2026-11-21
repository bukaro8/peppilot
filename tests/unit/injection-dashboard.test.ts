import { describe, expect, it } from "vitest";

import {
  classifyDashboardInjectionActions,
  type InjectionRecordRow,
} from "@/lib/injection/service";
import type { ScheduledProtocolEvent } from "@/lib/protocol-calendar/service";

const event = (id: string, date: string): ScheduledProtocolEvent => ({
  catalogueEntryId: `catalogue-${id}`,
  cycleId: `cycle-${id}`,
  cycleName: `Cycle ${id}`,
  date,
  doseAmount: "1.0000",
  doseUnit: "mg",
  id,
  peptideName: `Peptide ${id}`,
  revisionId: `revision-${id}`,
  scheduleStepId: `step-${id}`,
  timeOfDay: "08:00",
});

const record = (scheduledOccurrenceId: string, status: InjectionRecordRow["status"]) => ({
  scheduledOccurrenceId,
  status,
}) as InjectionRecordRow;

describe("dashboard injection actions", () => {
  it("classifies all resolved statuses and today's pending actions", () => {
    const result = classifyDashboardInjectionActions(
      [event("completed", "2026-11-02"), event("skipped", "2026-11-02"), event("missed", "2026-11-02"), event("pending", "2026-11-02")],
      [record("completed", "completed"), record("skipped", "skipped"), record("missed", "missed")],
      "2026-11-02",
    );
    expect(result.todayActions.map((action) => action.state)).toEqual([
      "completed", "skipped", "missed", "pending",
    ]);
    expect(result.pendingCount).toBe(1);
    expect(result.hasPendingActions).toBe(true);
  });

  it("shows only unresolved previous events as overdue", () => {
    const result = classifyDashboardInjectionActions(
      [event("resolved", "2026-11-01"), event("overdue", "2026-11-01")],
      [record("resolved", "skipped")],
      "2026-11-02",
    );
    expect(result.overdueActions.map((action) => action.event.id)).toEqual(["overdue"]);
    expect(result.pendingCount).toBe(1);
  });

  it("clears the pending indicator when every action is resolved", () => {
    const result = classifyDashboardInjectionActions(
      [event("one", "2026-11-02"), event("two", "2026-11-02")],
      [record("one", "completed"), record("two", "missed")],
      "2026-11-02",
    );
    expect(result.pendingCount).toBe(0);
    expect(result.hasPendingActions).toBe(false);
  });
});
