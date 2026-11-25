import { describe, expect, it } from "vitest";
import { revisionDateBounds } from "@/lib/protocol-cycle/revision-dates";

describe("revision date bounds", () => {
  it("recognises the reported exhausted range", () => {
    expect(revisionDateBounds({ startDate: "2026-11-01", latestEffectiveFrom: "2026-11-23", plannedEndDate: "2026-11-23" })).toEqual({ minimumDate: "2026-11-24", maximumDate: "2026-11-23", available: false });
  });
  it("allows the final cycle day and uses the latest interruption as a lower bound", () => {
    expect(revisionDateBounds({ startDate: "2026-11-01", latestEffectiveFrom: "2026-11-20", lastInterruptionDate: "2026-11-23", plannedEndDate: "2026-11-23" })).toEqual({ minimumDate: "2026-11-23", maximumDate: "2026-11-23", available: true });
  });
  it("keeps open-ended cycles unbounded across year boundaries", () => {
    expect(revisionDateBounds({ startDate: "2026-01-01", latestEffectiveFrom: "2026-12-31", plannedEndDate: null })).toEqual({ minimumDate: "2027-01-01", maximumDate: null, available: true });
  });
});
