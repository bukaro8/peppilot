import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type SourceStage = {
  dose_basis: string;
  frequency: { administrations_per_day: number | null };
  ingredient_doses: unknown[];
};
type SourcePreset = {
  approval_status: string;
  duration_days?: number;
  duration_type: string;
  schedule: SourceStage[];
};
type SourceCompound = { protocols: Record<string, SourcePreset>; slug: string };
const approved = JSON.parse(
  readFileSync(new URL("../../scripts/peptide-protocols-approved.json", import.meta.url), "utf8"),
) as { compounds: SourceCompound[]; schema_version: string };

describe("approved protocol source", () => {
  it("contains exactly 28 unique compounds and 84 approved presets", () => {
    expect(approved.schema_version).toBe("1.2.0");
    expect(approved.compounds).toHaveLength(28);
    expect(new Set(approved.compounds.map((compound) => compound.slug)).size).toBe(28);
    const presets = approved.compounds.flatMap((compound) => Object.values(compound.protocols));
    expect(presets).toHaveLength(84);
    expect(presets.every((preset) => preset.approval_status === "approved")).toBe(true);
  });

  it("preserves exact day courses and all supported duration types", () => {
    const epitalon = approved.compounds.find((compound) => compound.slug === "epitalon")!;
    expect([epitalon.protocols.conservative.duration_days, epitalon.protocols.most_used.duration_days, epitalon.protocols.adventurous.duration_days]).toEqual([10, 15, 20]);
    const durationTypes = new Set(approved.compounds.flatMap((compound) => Object.values(compound.protocols).map((preset) => preset.duration_type)));
    expect(durationTypes).toEqual(new Set(["fixed_cycle", "open_ended", "as_needed"]));
  });

  it("retains daily-total and ingredient dose semantics", () => {
    const dailyTotal = approved.compounds.find((compound) => compound.slug === "cjc-1295-no-dac-ipamorelin")!;
    expect(Object.values(dailyTotal.protocols).every((preset) => preset.schedule[0].dose_basis === "combined_daily_mass" && preset.schedule[0].frequency.administrations_per_day === null)).toBe(true);
    const blends = approved.compounds.flatMap((compound) => Object.values(compound.protocols).flatMap((preset) => preset.schedule)).filter((stage) => stage.dose_basis === "combined_blend_mass");
    expect(blends.length).toBeGreaterThan(0);
    expect(blends.every((stage) => stage.ingredient_doses.length > 1)).toBe(true);
  });
});
