import { describe, expect, it } from "vitest";

import {
  calculateInjectionSiteRotation,
  type InjectionSiteHistoryItem,
} from "@/lib/injection/rotation";
import { injectionSites, type InjectionSiteId } from "@/lib/injection/sites";

const historyItem = (
  recordId: string,
  injectionSiteId: InjectionSiteId,
  actualDate: string,
  actualTime = "08:00",
  actualVolumeMl: string | null = null,
): InjectionSiteHistoryItem => ({ actualDate, actualTime, actualVolumeMl, injectionSiteId, recordId });

describe("injection-site rotation", () => {
  it("rotates deterministically after multiple injections on the same day", () => {
    const candidates = injectionSites.map((site) => site.id);
    const first = calculateInjectionSiteRotation({ asOfDate: "2026-11-02", candidateSiteIds: candidates, history: [] });
    expect(first.suggestedSiteId).toBe("abdomen_left_upper");
    const second = calculateInjectionSiteRotation({
      asOfDate: "2026-11-02",
      candidateSiteIds: candidates,
      history: [historyItem("one", "abdomen_left_upper", "2026-11-02")],
    });
    expect(second.suggestedSiteId).toBe("abdomen_left_lower");
    expect(second.activity.abdomen_left_upper).toBe("red");
    expect(second.activity.abdomen_left_lower).toBe("suggested");
  });

  it("prefers oldest use, then fewer injections, then stable catalogue order", () => {
    const candidates: InjectionSiteId[] = [
      "abdomen_left_upper", "abdomen_left_lower", "abdomen_right_upper",
    ];
    const result = calculateInjectionSiteRotation({
      asOfDate: "2026-11-10",
      candidateSiteIds: candidates,
      history: [
        historyItem("one", "abdomen_left_upper", "2026-11-01"),
        historyItem("two", "abdomen_left_upper", "2026-11-01"),
        historyItem("three", "abdomen_left_lower", "2026-11-01"),
        historyItem("four", "abdomen_right_upper", "2026-11-03"),
      ],
    });
    expect(result.suggestedSiteId).toBe("abdomen_left_lower");
    expect(result.reason).toContain("used 1 time");
  });

  it("uses standard-volume calendar-day colours", () => {
    const result = calculateInjectionSiteRotation({
      asOfDate: "2026-11-10",
      candidateSiteIds: ["upper_buttock_right"],
      history: [
        historyItem("today", "abdomen_left_upper", "2026-11-10"),
        historyItem("yesterday", "abdomen_left_lower", "2026-11-09"),
        historyItem("two-days", "abdomen_right_upper", "2026-11-08"),
        historyItem("older", "abdomen_right_lower", "2026-11-07"),
      ],
    });
    expect(result.activity).toMatchObject({
      abdomen_left_upper: "red",
      abdomen_left_lower: "yellow",
      abdomen_right_upper: "green",
      abdomen_right_lower: "green",
      upper_buttock_right: "suggested",
    });
  });

  it("extends rest colours above 0.8 mL and applies the most restrictive status", () => {
    const result = calculateInjectionSiteRotation({
      asOfDate: "2026-11-10",
      candidateSiteIds: ["upper_buttock_right"],
      history: [
        historyItem("large-yesterday", "abdomen_left_upper", "2026-11-09", "08:00", "0.9"),
        historyItem("small-two-days", "abdomen_left_lower", "2026-11-08", "08:00", "0.8"),
        historyItem("large-two-days", "abdomen_right_upper", "2026-11-08", "08:00", "1.0"),
        historyItem("old-small", "thigh_left_upper", "2026-11-07", "08:00", "0.5"),
        historyItem("today-large", "thigh_left_upper", "2026-11-10", "09:00", "1.1"),
      ],
    });
    expect(result.activity).toMatchObject({
      abdomen_left_upper: "red",
      abdomen_left_lower: "green",
      abdomen_right_upper: "yellow",
      thigh_left_upper: "red",
    });
  });

  it("never suggests disabled sites and returns a clear fallback when none are enabled", () => {
    const enabled = calculateInjectionSiteRotation({
      asOfDate: "2026-11-02",
      candidateSiteIds: ["thigh_right_lower"],
      history: [],
    });
    expect(enabled.suggestedSiteId).toBe("thigh_right_lower");
    const none = calculateInjectionSiteRotation({
      asOfDate: "2026-11-02",
      candidateSiteIds: [],
      history: [],
    });
    expect(none.suggestedSiteId).toBeNull();
    expect(none.reason).toContain("No enabled subzones");
  });
});
