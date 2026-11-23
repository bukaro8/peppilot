import { describe, expect, it } from "vitest";

import { formatApprovedStageRange } from "@/lib/approved-protocol/presentation";
import type { ApprovedScheduleStage } from "@/lib/approved-protocol/types";

const stage = (start_week: number, end_week: number | null) => ({
  start_week,
  end_week,
  dose_amount: 1,
  dose_unit: "mg",
  dose_basis: "single_compound_mass",
  ingredient_doses: [],
  route: "subcutaneous",
  frequency: {
    type: "daily",
    administrations_per_day: 1,
    administrations_per_week: 7,
    days_per_week: 7,
    weekdays: [],
    interval_days: null,
    time_of_day: [],
  },
  source_ids: [],
  notes: "",
}) satisfies ApprovedScheduleStage;

describe("approved protocol schedule presentation", () => {
  it("shows whole-week ranges as weeks", () => {
    expect(formatApprovedStageRange(stage(1, 4))).toBe("Weeks 1–4");
  });

  it("shows fractional week ranges as exact days", () => {
    expect(formatApprovedStageRange(stage(1, 15 / 7))).toBe("Days 1–15");
  });

  it("keeps ongoing schedules open-ended", () => {
    expect(formatApprovedStageRange(stage(5, null))).toBe("Week 5 onward");
  });
});
