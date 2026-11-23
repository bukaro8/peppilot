import { describe, expect, it } from "vitest";

import { canonicalizeScheduleFrequencyFields } from "@/lib/protocol-cycle/service";
import type { ProtocolTemplateScheduleInput } from "@/lib/protocol-template/validation";

const schedule = (frequency: ProtocolTemplateScheduleInput["frequency"]): ProtocolTemplateScheduleInput => ({
  catalogueEntryId: "catalogue-entry",
  daysOfWeek: [1, 3, 5],
  doseAmount: "2.8",
  doseUnit: "mg",
  endDay: 56,
  frequency,
  intervalDays: 3,
  startDay: 1,
  timeOfDay: null,
});

describe("cycle schedule frequency fields", () => {
  it.each(["daily", "as_needed"] as const)("removes stale weekdays and intervals from %s schedules", (frequency) => {
    expect(canonicalizeScheduleFrequencyFields(schedule(frequency))).toMatchObject({
      daysOfWeek: [],
      frequency,
      intervalDays: null,
    });
  });

  it("keeps selected weekdays only for weekly schedules", () => {
    expect(canonicalizeScheduleFrequencyFields(schedule("weekly"))).toMatchObject({
      daysOfWeek: [1, 3, 5],
      frequency: "weekly",
      intervalDays: null,
    });
  });

  it("keeps the interval only for interval schedules", () => {
    expect(canonicalizeScheduleFrequencyFields(schedule("interval_days"))).toMatchObject({
      daysOfWeek: [],
      frequency: "interval_days",
      intervalDays: 3,
    });
  });
});
