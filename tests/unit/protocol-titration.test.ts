import { describe, expect, it } from "vitest";

import {
  calculateTimelineRanges,
  convertMassUnit,
  formatTimelineRange,
  moveTimelineStage,
  scaleBlendIngredients,
} from "@/lib/protocol-titration/timeline";

describe("visual titration timeline", () => {
  it("recalculates later week ranges after duration changes and reordering", () => {
    const stages = [
      { dose: "0.25", duration: 4, unit: "weeks" as const },
      { dose: "0.5", duration: 2, unit: "weeks" as const },
      { dose: "1", duration: 4, unit: "weeks" as const },
    ];
    expect(calculateTimelineRanges(stages)).toEqual([
      { startDay: 1, endDay: 28 },
      { startDay: 29, endDay: 42 },
      { startDay: 43, endDay: 70 },
    ]);
    expect(moveTimelineStage(stages, 2, 1).map((stage) => stage.dose)).toEqual([
      "0.25",
      "1",
      "0.5",
    ]);
  });

  it("preserves exact-day courses and open-ended final stages", () => {
    const ranges = calculateTimelineRanges(
      [
        { duration: 10, unit: "days" },
        { duration: 5, unit: "days" },
      ],
      true,
    );
    expect(ranges).toEqual([
      { startDay: 1, endDay: 10 },
      { startDay: 11, endDay: null },
    ]);
    expect(formatTimelineRange(1, 10, "days")).toBe("Days 1–10");
    expect(formatTimelineRange(11, null, "days")).toBe("Day 11 onward");
  });

  it("rescales blend ingredients with fixed-point arithmetic", () => {
    expect(
      scaleBlendIngredients("5.6", "mg", [
        { name: "GHK-Cu", doseAmount: "2", doseUnit: "mg" },
        { name: "BPC-157", doseAmount: "0.4", doseUnit: "mg" },
        { name: "TB-500", doseAmount: "0.4", doseUnit: "mg" },
      ]),
    ).toEqual([
      { name: "GHK-Cu", doseAmount: "4", doseUnit: "mg" },
      { name: "BPC-157", doseAmount: "0.8", doseUnit: "mg" },
      { name: "TB-500", doseAmount: "0.8", doseUnit: "mg" },
    ]);
  });

  it("converts mg and mcg without floating-point drift", () => {
    expect(convertMassUnit("2.8", "mg", "mcg")).toBe("2800");
    expect(convertMassUnit("400", "mcg", "mg")).toBe("0.4");
  });
});
