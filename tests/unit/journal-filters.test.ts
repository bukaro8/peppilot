import { describe, expect, it } from "vitest";

import { parseJournalFilters } from "@/lib/health/journal-service";

describe("health journal filters", () => {
  it("normalizes supported date, type and metric filters", () => {
    expect(parseJournalFilters({ from: "2026-10-01", metric: "energy", to: "2026-10-31", type: "check_in" })).toEqual({
      dateFrom: "2026-10-01", dateTo: "2026-10-31", metricId: "energy", recordType: "check_in",
    });
  });

  it("rejects invalid ranges and identifiers", () => {
    expect(() => parseJournalFilters({ from: "2026-11-01", to: "2026-10-01" })).toThrow("From date");
    expect(() => parseJournalFilters({ type: "private" })).toThrow("record type");
    expect(() => parseJournalFilters({ metric: "made_up" })).toThrow("metric");
  });
});
