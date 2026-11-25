import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/cycles/actions", () => ({ reviseProtocolCycleScheduleAction: vi.fn() }));
import { CycleScheduleForm } from "@/components/protocol-cycle/cycle-schedule-form";

function render(frequency: "weekly" | "daily", daysOfWeek: number[]) {
  return renderToStaticMarkup(createElement(CycleScheduleForm, {
    catalogue: [{ id: "glow", displayName: "GLOW" }], cycleId: "test-cycle",
    minimumDate: "2026-11-24", plannedEndDate: "2026-12-31",
    initial: [{ catalogueEntryId: "glow", daysOfWeek, doseAmount: "2.8", doseUnit: "mg", endDay: 56, frequency, intervalDays: null, startDay: 1, timeOfDay: "08:00" }],
  }));
}

describe("cycle revision weekday selection", () => {
  it("allows an ongoing conversion beyond the old end date with no contradictory maximum", () => {
    const html = renderToStaticMarkup(createElement(CycleScheduleForm, { catalogue: [], cycleId: "ongoing", initial: [{ catalogueEntryId: "trt", daysOfWeek: [1, 4], doseAmount: "62", doseUnit: "mg", endDay: 1, frequency: "weekly", intervalDays: null, startDay: 1, timeOfDay: null }], minimumDate: "2026-11-24", plannedEndDate: "2026-11-23", initialOngoing: true }));
    expect(html).toContain('name="makeOngoing" value="1"');
    const date = html.match(/<input[^>]*name="effectiveFrom"[^>]*>/)?.[0];
    expect(date).toContain('min="2026-11-24"');
    expect(date).not.toContain('max=');
    expect(html).toContain('placeholder="Ongoing"');
    expect(html).not.toContain("No revision dates remain");
  });
  it("does not render an impossible date picker when no revision dates remain", () => {
    const html = renderToStaticMarkup(createElement(CycleScheduleForm, { catalogue: [], cycleId: "exhausted", initial: [], minimumDate: "2026-11-24", plannedEndDate: "2026-11-23" }));
    expect(html).toContain("No revision dates remain");
    expect(html).not.toContain('type="date"');
    expect(html).not.toContain('type="submit"');
  });
  it("labels saved Tuesday, Thursday, Saturday and Sunday selections", () => {
    const html = render("weekly", [0, 2, 4, 6]);
    expect(html).toContain("Selected: Tuesday, Thursday, Saturday, Sunday");
    for (const day of ["Tuesday", "Thursday", "Saturday", "Sunday"]) expect(html.match(new RegExp(`<input[^>]*aria-label="${day}"[^>]*>`))?.[0]).toContain("checked");
    expect(html.match(/<input[^>]*name="schedule\.0\.daysOfWeek"[^>]*>/)?.[0]).toContain('value="0,2,4,6"');
    expect(html).not.toContain('placeholder="0,2,4"');
  });
  it("prompts for at least one day on an empty weekly schedule", () => {
    expect(render("weekly", [])).toContain("Choose at least one day.");
  });
  it("does not submit stale weekdays for daily schedules", () => {
    const html = render("daily", [0, 2, 4, 6]);
    expect(html).not.toContain("Choose injection days");
    expect(html.match(/<input[^>]*name="schedule\.0\.daysOfWeek"[^>]*>/)?.[0]).toContain('value=""');
  });
});
