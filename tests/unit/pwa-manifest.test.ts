import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  it("publishes installable launcher and maskable icons", () => {
    const value = manifest();
    expect(value).toMatchObject({
      display: "standalone",
      name: "PepPilot",
      short_name: "PepPilot",
      start_url: "/dashboard",
    });
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]));
  });
});
