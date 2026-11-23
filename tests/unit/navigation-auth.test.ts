import { describe, expect, it } from "vitest";

import { desktopNavigationItems, mobileNavigationItems } from "@/components/navigation/app-navigation";
import { safeReturnPath } from "@/lib/auth/return-path";

describe("application navigation and auth return paths", () => {
  it("keeps every essential desktop destination visible", () => {
    expect(desktopNavigationItems.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/dashboard", label: "Home" },
      { href: "/calendar/week", label: "Calendar" },
      { href: "/injections", label: "Injections" },
      { href: "/journal", label: "Journal" },
      { href: "/templates", label: "Protocol library" },
      { href: "/protocols", label: "My protocols" },
      { href: "/cycles", label: "My cycles" },
      { href: "/account", label: "Profile" },
      { href: "/account#settings", label: "Settings" },
    ]);
    expect(mobileNavigationItems.find((item) => item.label === "More")?.matches).toContain("/templates");
  });

  it("preserves local destinations and rejects external redirect attempts", () => {
    expect(safeReturnPath("/cycles?filter=active#current")).toBe("/cycles?filter=active#current");
    expect(safeReturnPath("https://example.test/phish")).toBe("/dashboard");
    expect(safeReturnPath("//example.test/phish")).toBe("/dashboard");
    expect(safeReturnPath("/\\example.test")).toBe("/dashboard");
  });
});
