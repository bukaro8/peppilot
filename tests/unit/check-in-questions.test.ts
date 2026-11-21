import { describe, expect, it } from "vitest";

import { selectAdaptiveQuestionIds } from "@/lib/health/check-in-questions";

describe("adaptive check-in questions", () => {
  it("always includes the standard daily scores", () => {
    expect(selectAdaptiveQuestionIds([])).toEqual(["sleep_quality", "energy", "recovery"]);
  });

  it("deduplicates overlapping protocol categories", () => {
    expect(selectAdaptiveQuestionIds(["weight_management", "weight_management", "growth_body_composition", "cognitive"])).toEqual([
      "sleep_quality", "energy", "recovery", "appetite_control", "waist_body_composition", "focus", "stress",
    ]);
  });

  it("respects optional-question preferences without hiding core scores", () => {
    expect(selectAdaptiveQuestionIds(["weight_management", "cognitive"], { appetite_control: false, focus: false })).toEqual([
      "sleep_quality", "energy", "recovery", "waist_body_composition", "stress",
    ]);
  });
});
