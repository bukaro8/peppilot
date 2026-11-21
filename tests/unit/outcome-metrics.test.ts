import { describe, expect, it } from "vitest";

import { classifyBaselineValue, getOutcomeMetric, isOutcomeMetricId } from "@/lib/health/outcome-metrics";

describe("health outcome metrics", () => {
  it("combines standard measurements and check-in scores", () => {
    expect(getOutcomeMetric("waist_circumference")).toMatchObject({ source: "measurement", unit: "cm" });
    expect(getOutcomeMetric("energy")).toMatchObject({ source: "check_in", unit: "score", wholeNumber: true });
    expect(isOutcomeMetricId("unknown")).toBe(false);
  });

  it("marks missing and zero baselines as unavailable for future percentage calculations", () => {
    expect(classifyBaselineValue(null)).toBe("missing");
    expect(classifyBaselineValue(0)).toBe("unsuitable");
    expect(classifyBaselineValue(Number.NaN)).toBe("unsuitable");
    expect(classifyBaselineValue(72.5)).toBe("valid");
  });
});
