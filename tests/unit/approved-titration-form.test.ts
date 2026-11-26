import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/protocols/new/approved/actions", () => ({ createApprovedProtocolAction: vi.fn() }));

import { ApprovedTitrationForm } from "@/components/approved-protocol/approved-titration-form";
import type { ApprovedProtocolPreset } from "@/lib/approved-protocol/types";

describe("approved titration form required details", () => {
  it("defaults an unspecified count to 1 inside collapsed settings without changing the source", () => {
    const source = JSON.parse(readFileSync("scripts/peptide-protocols-approved.json", "utf8"));
    const compound = source.compounds.find((item: { slug: string }) => item.slug === "cjc-1295-no-dac-ipamorelin");
    const preset = { id: "test-cjc", displayName: compound.name, durationType: "fixed_cycle", definition: compound.protocols.conservative } as ApprovedProtocolPreset;
    const html = renderToStaticMarkup(createElement(ApprovedTitrationForm, { preset, onboarding: false }));
    const input = html.match(/<input[^>]*name="stage\.0\.administrationsPerDay"[^>]*>/)?.[0];
    expect(input).toBeDefined();
    expect(input).toContain('value="1"');
    expect(preset.definition.schedule[0].frequency.administrations_per_day).toBeNull();
    expect(input).toContain("required");
    expect(html.indexOf(input!)).toBeGreaterThan(html.indexOf("<details"));
    expect(html.match(/name="stage\.0\.administrationsPerDay"/g)).toHaveLength(1);
    expect(html).toContain("combined daily total");
  });
  it("preserves an explicitly supplied administration count", () => {
    const source = JSON.parse(readFileSync("scripts/peptide-protocols-approved.json", "utf8"));
    const compound = source.compounds.find((item: { slug: string }) => item.slug === "cjc-1295-no-dac-ipamorelin");
    const definition = structuredClone(compound.protocols.conservative);
    definition.schedule[0].frequency.administrations_per_day = 2;
    const preset = { id: "test-cjc", displayName: compound.name, durationType: "fixed_cycle", definition } as ApprovedProtocolPreset;
    const html = renderToStaticMarkup(createElement(ApprovedTitrationForm, { preset, onboarding: false }));
    expect(html.match(/<input[^>]*name="stage\.0\.administrationsPerDay"[^>]*>/)?.[0]).toContain('value="2"');
  });
});
