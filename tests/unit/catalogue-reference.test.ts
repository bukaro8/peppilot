import { describe, expect, it } from "vitest";

import referenceData from "@/scripts/catalogue-reference.json";
import {
  catalogueCategories,
  catalogueCategoryLabels,
  isCatalogueCategory,
} from "@/lib/catalogue/constants";

describe("catalogue reference data", () => {
  it("contains the 16 approved unique catalogue entries", () => {
    expect(referenceData.entries).toHaveLength(16);
    expect(new Set(referenceData.entries.map((entry) => entry.id)).size).toBe(16);
    expect(new Set(referenceData.entries.map((entry) => entry.slug)).size).toBe(16);
    expect(referenceData.entries.filter((entry) => entry.kind === "blend").map((entry) => entry.displayName)).toEqual([
      "KLOW",
      "Wolverine Blend",
      "CJC-1295 (no DAC) + Ipamorelin",
    ]);
  });

  it("uses only supported categories with display labels", () => {
    expect(referenceData.entries.every((entry) => isCatalogueCategory(entry.category))).toBe(true);
    expect(Object.keys(catalogueCategoryLabels)).toEqual(catalogueCategories);
  });

  it("records the approved blend ingredients without dosing data", () => {
    const ingredientsFor = (id: string) =>
      referenceData.ingredients
        .filter((ingredient) => ingredient.catalogueEntryId === id)
        .map((ingredient) => ingredient.displayName);

    expect(ingredientsFor("catalogue-wolverine-blend")).toEqual(["BPC-157", "TB-500"]);
    expect(ingredientsFor("catalogue-cjc-1295-no-dac-ipamorelin")).toEqual([
      "CJC-1295 (no DAC)",
      "Ipamorelin",
    ]);
    expect(ingredientsFor("catalogue-klow")).toEqual(["GHK-Cu", "BPC-157", "TB-500", "KPV"]);
    expect(JSON.stringify(referenceData)).not.toMatch(/dose|dosage|price/i);
  });

  it("marks NAD+ as a tracked compound and Tesamorelin for waist tracking", () => {
    expect(referenceData.entries.find((entry) => entry.slug === "nad-plus")?.kind).toBe(
      "tracked_compound",
    );
    expect(referenceData.entries.find((entry) => entry.slug === "tesamorelin")?.trackingFocus).toBe(
      "Waist measurement",
    );
  });
});
