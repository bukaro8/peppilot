import { describe, expect, it } from "vitest";

import {
  formatAnatomicalInjectionSite,
  formatInjectionSite,
  getInjectionSite,
  injectionSites,
  isInjectionSiteId,
} from "@/lib/injection/sites";

describe("injection site catalogue", () => {
  it("defines exactly 14 unique stable subzones across five regions", () => {
    expect(injectionSites).toHaveLength(14);
    expect(new Set(injectionSites.map((site) => site.id)).size).toBe(14);
    expect(new Set(injectionSites.map((site) => site.zone))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(injectionSites.filter((site) => site.region === "Abdomen")).toHaveLength(4);
    expect(injectionSites.filter((site) => site.region === "Love handles")).toHaveLength(2);
    expect(injectionSites.filter((site) => site.region === "Thighs")).toHaveLength(4);
    expect(injectionSites.filter((site) => site.region === "Upper arms")).toHaveLength(2);
    expect(injectionSites.filter((site) => site.region === "Upper buttocks")).toHaveLength(2);
  });

  it.each(injectionSites)("resolves and formats $id", (site) => {
    expect(isInjectionSiteId(site.id)).toBe(true);
    expect(getInjectionSite(site.id)).toEqual(site);
    expect(formatInjectionSite(site.id)).toBe(
      `Zone ${site.zone} — ${site.region} · ${site.subzone}`,
    );
  });

  it("handles an unspecified or invalid site", () => {
    expect(isInjectionSiteId("abdomen_middle")).toBe(false);
    expect(getInjectionSite(null)).toBeNull();
    expect(formatInjectionSite(null)).toBe("Site unspecified");
  });

  it("uses anatomical names without exposing internal zone codes", () => {
    expect(formatAnatomicalInjectionSite("abdomen_left_upper")).toBe("Upper-left abdomen");
    expect(formatAnatomicalInjectionSite("love_handle_right")).toBe("Right flank");
    expect(formatAnatomicalInjectionSite("upper_buttock_left")).toBe("Left buttock");
  });
});
