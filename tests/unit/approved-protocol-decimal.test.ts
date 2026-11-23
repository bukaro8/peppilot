import { describe, expect, it } from "vitest";

import {
  formatApprovedDecimal,
  massInScaledMicrograms,
  parseApprovedDecimal,
} from "@/lib/approved-protocol/decimal";

describe("approved protocol decimal handling", () => {
  it("cleans binary floating-point artifacts without changing the dose", () => {
    expect(formatApprovedDecimal(0.39999999999999997)).toBe("0.4");
    expect(formatApprovedDecimal(0.19999999999999998)).toBe("0.2");
    expect(formatApprovedDecimal(0.4375)).toBe("0.4375");
  });

  it("parses only database-supported precision", () => {
    expect(parseApprovedDecimal("2.8000")).toBe(BigInt(28_000));
    expect(parseApprovedDecimal("0.0001")).toBe(BigInt(1));
    expect(parseApprovedDecimal("0.00001")).toBeNull();
  });

  it("compares mg and mcg on one exact fixed-point scale", () => {
    expect(massInScaledMicrograms("0.125", "mg")).toBe(BigInt(1_250_000));
    expect(massInScaledMicrograms("125", "mcg")).toBe(BigInt(1_250_000));
  });
});
