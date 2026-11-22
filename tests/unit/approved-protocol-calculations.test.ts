import { describe, expect, it } from "vitest";

import { calculateAdministration, calculatePreparation } from "@/lib/approved-protocol/calculations";

describe("approved protocol preparation arithmetic", () => {
  it("uses decimal arithmetic for concentration, volume, and syringe markings", () => {
    const preparation = calculatePreparation("5", "2");
    expect(preparation.concentrationMgPerMl).toBe("2.5");
    expect(calculateAdministration("250", "mcg", preparation.concentrationMgPerMl, "100")).toEqual({ volumeMl: "0.1", syringeUnits: "10" });
  });

  it("calculates only from supplied values and rejects invalid decimals", () => {
    expect(() => calculatePreparation("", "2")).toThrow();
    expect(calculateAdministration("1", "mg", "3").volumeMl).toBe("0.333333");
  });
});
