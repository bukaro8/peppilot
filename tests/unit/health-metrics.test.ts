import { describe, expect, it } from "vitest";

import { convertToCanonical, healthMetrics } from "@/lib/health/metrics";

describe("health metric catalogue", () => {
  it("defines stable canonical metrics and units", () => {
    expect(healthMetrics.map((metric) => metric.id)).toEqual([
      "weight", "waist_circumference", "body_fat_percentage", "muscle_mass",
      "hip_circumference", "chest_circumference",
    ]);
    expect(healthMetrics.find((metric) => metric.id === "weight")).toMatchObject({ canonicalUnit: "kg", units: ["kg", "lb"] });
  });

  it("converts imperial values to canonical storage precisely", () => {
    expect(convertToCanonical("weight", 220.4623, "lb")).toEqual({ canonicalUnit: "kg", canonicalValue: 100 });
    expect(convertToCanonical("waist_circumference", 40, "in")).toEqual({ canonicalUnit: "cm", canonicalValue: 101.6 });
  });

  it("rejects incompatible units and out-of-range values", () => {
    expect(() => convertToCanonical("body_fat_percentage", 20, "kg")).toThrow("valid unit");
    expect(() => convertToCanonical("body_fat_percentage", 0, "percent")).toThrow("between 1 and 75");
    expect(() => convertToCanonical("weight", 501, "kg")).toThrow("between 20 and 500");
  });
});
