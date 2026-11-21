import { describe, expect, it } from "vitest";

import { formatDoseAmount, formatTemplateFrequency } from "@/lib/protocol-template/presentation";
import { schedulesMatchTemplate } from "@/lib/member-protocol/service";
import { completeMatchingWeeksBeforeDeviation } from "@/lib/protocol-cycle/service";
import { validateProtocolTemplateInput } from "@/lib/protocol-template/validation";

const validInput = {
  description: "An administrator-authored test template.",
  durationDays: 28,
  name: "Test template",
  slug: "test-template",
  schedules: [
    {
      catalogueEntryId: "catalogue-bpc-157",
      daysOfWeek: [1, 3, 5],
      doseAmount: "1.2500",
      doseUnit: "mg",
      endDay: 28,
      frequency: "weekly" as const,
      intervalDays: null,
      startDay: 1,
      timeOfDay: "08:30",
    },
  ],
};

describe("protocol template validation", () => {
  it("normalizes a valid authored schedule", () => {
    expect(validateProtocolTemplateInput(validInput)).toEqual({
      success: true,
      value: validInput,
    });
  });

  it.each([
    [{ ...validInput, slug: "Not Valid" }, "Slug must use lowercase"],
    [{ ...validInput, durationDays: 0 }, "Duration must be"],
    [{ ...validInput, schedules: [] }, "Add between 1 and 100"],
    [
      { ...validInput, schedules: [{ ...validInput.schedules[0], doseAmount: "0" }] },
      "positive dose",
    ],
    [
      { ...validInput, schedules: [{ ...validInput.schedules[0], endDay: 29 }] },
      "remain within the duration",
    ],
    [
      {
        ...validInput,
        schedules: [
          { ...validInput.schedules[0], daysOfWeek: [], frequency: "weekly" as const },
        ],
      },
      "choose at least one weekday",
    ],
  ])("rejects invalid template content", (input, message) => {
    const result = validateProtocolTemplateInput(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain(message);
  });

  it("formats schedule information for read-only views", () => {
    expect(formatTemplateFrequency("daily", [], null)).toBe("Daily");
    expect(formatTemplateFrequency("weekly", [1, 3, 5], null)).toBe("Mon, Wed, Fri");
    expect(formatTemplateFrequency("interval_days", [], 3)).toBe("Every 3 days");
    expect(formatDoseAmount("1.2500")).toBe("1.25");
  });

  it("matches copied schedules independently of display order", () => {
    const second = {
      ...validInput.schedules[0],
      catalogueEntryId: "catalogue-tb-500",
      doseAmount: "2.0000",
    };
    expect(
      schedulesMatchTemplate(
        { ...validInput, schedules: [second, validInput.schedules[0]] },
        { durationDays: 28, steps: [validInput.schedules[0], second] },
      ),
    ).toBe(true);
    expect(
      schedulesMatchTemplate(
        { ...validInput, schedules: [{ ...validInput.schedules[0], doseAmount: "1.5" }] },
        { durationDays: 28, steps: validInput.schedules },
      ),
    ).toBe(false);
  });

  it("counts only complete template-matching weeks before deviation", () => {
    expect(
      completeMatchingWeeksBeforeDeviation({
        firstDeviatedOn: "2026-01-15",
        sourceTemplateVersionId: "version-1",
        startDate: "2026-01-01",
        templateInitiallyMatching: true,
      }),
    ).toBe(2);
    expect(
      completeMatchingWeeksBeforeDeviation({
        firstDeviatedOn: null,
        sourceTemplateVersionId: "version-1",
        startDate: "2026-01-01",
        templateInitiallyMatching: true,
      }),
    ).toBeNull();
  });
});
