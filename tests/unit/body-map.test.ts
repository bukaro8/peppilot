import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BodyMap } from "@/components/injection/body-map";
import { calculateInjectionSiteRotation } from "@/lib/injection/rotation";

describe("body-map orientation", () => {
  it("places the user's left on screen left without changing recorded site identities", () => {
    const rotation = { ...calculateInjectionSiteRotation({ asOfDate: "2026-11-24", candidateSiteIds: [], history: [] }), disabledSiteIds: [] };
    const html = renderToStaticMarkup(createElement(BodyMap, { readOnly: true, rotation, value: null, onChange: () => undefined }));
    const overlay = (name: string) => html.match(new RegExp(`<span[^>]*aria-label="${name}: available"[^>]*>`))?.[0];
    expect(overlay("Upper-left abdomen")).toContain("left:42%");
    expect(overlay("Upper-right abdomen")).toContain("left:58%");
    expect(overlay("Left buttock")).toContain("left:43%");
    expect(overlay("Right buttock")).toContain("left:57%");
    expect(html.match(/role="img"/g)).toHaveLength(14);
    expect(html).toContain("Front · mirror view");
  });
});
