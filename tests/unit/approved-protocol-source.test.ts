import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatApprovedDecimal, massInScaledMicrograms } from "@/lib/approved-protocol/decimal";

type SourceStage = {
  dose_amount: number;
  dose_basis: "single_compound_mass" | "combined_blend_mass" | "combined_daily_mass";
  dose_unit: "mg" | "mcg";
  frequency: {
    administrations_per_day: number | null;
    administrations_per_week: number | null;
    days_per_week: number | null;
    interval_days: number | null;
    type: string;
    weekdays: string[];
  };
  ingredient_doses: Array<{ dose_amount: number; dose_unit: "mg" | "mcg"; name: string }>;
  route: string;
};
type SourcePreset = {
  approval_status: string;
  duration_days?: number | null;
  duration_weeks: number | null;
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
    const glow = approved.compounds.find((compound) => compound.slug === "glow")!;
    expect(glow.protocols.most_used.duration_days).toBeUndefined();
    expect(glow.protocols.most_used.duration_weeks).toBe(8);
    expect(Math.round(glow.protocols.most_used.duration_weeks! * 7)).toBe(56);
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

  it("validates all 84 approved definitions and exact combined masses", () => {
    const failures: string[] = [];
    for (const compound of approved.compounds) {
      for (const [category, preset] of Object.entries(compound.protocols)) {
        const key = `${compound.slug}:${category}`;
        if (!preset.schedule.length) failures.push(`${key} has no stages`);
        if (preset.duration_type === "fixed_cycle") {
          const days = preset.duration_days ?? (preset.duration_weeks === null ? null : Math.round(preset.duration_weeks * 7));
          if (!days || !Number.isInteger(days) || days < 1) failures.push(`${key} has no exact fixed duration`);
        }
        for (const [index, stage] of preset.schedule.entries()) {
          const stageKey = `${key}:stage${index + 1}`;
          if (!stage.route) failures.push(`${stageKey} has no route state`);
          if (stage.frequency.type === "interval" && (!stage.frequency.interval_days || stage.frequency.interval_days < 1)) failures.push(`${stageKey} has no interval`);
          if ((stage.frequency.type === "days_per_week" || stage.frequency.type === "times_per_week") && !(stage.frequency.days_per_week ?? stage.frequency.administrations_per_week)) failures.push(`${stageKey} has no weekly count`);
          if (stage.dose_basis !== "single_compound_mass") {
            const combined = massInScaledMicrograms(formatApprovedDecimal(stage.dose_amount), stage.dose_unit);
            const ingredients = stage.ingredient_doses.reduce((total, ingredient) => total + (massInScaledMicrograms(formatApprovedDecimal(ingredient.dose_amount), ingredient.dose_unit) ?? BigInt(0)), BigInt(0));
            if (combined !== ingredients) failures.push(`${stageKey} ingredient mass does not equal its combined dose`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it.each(["glow", "klow", "wolverine-blend", "cjc-1295-no-dac-ipamorelin", "tesamorelin-ipamorelin"])("keeps every %s blend preset mass-balanced", (slug) => {
    const compound = approved.compounds.find((entry) => entry.slug === slug)!;
    expect(Object.values(compound.protocols)).toHaveLength(3);
    for (const preset of Object.values(compound.protocols)) {
      for (const stage of preset.schedule.filter((entry) => entry.dose_basis !== "single_compound_mass")) {
        const combined = massInScaledMicrograms(formatApprovedDecimal(stage.dose_amount), stage.dose_unit);
        const total = stage.ingredient_doses.reduce((sum, ingredient) => sum + massInScaledMicrograms(formatApprovedDecimal(ingredient.dose_amount), ingredient.dose_unit)!, BigInt(0));
        expect(total).toBe(combined);
      }
    }
  });
});
