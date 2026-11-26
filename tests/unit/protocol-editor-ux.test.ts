import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/protocols/actions", () => ({ createMemberProtocolAction: vi.fn(), updateMemberProtocolAction: vi.fn() }));
vi.mock("@/app/protocols/new/approved/actions", () => ({ createApprovedProtocolAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { FrequencySelect } from "@/components/protocol-titration/frequency-select";
import { ProtocolForm } from "@/components/member-protocol/protocol-form";
import { ApprovedTitrationForm } from "@/components/approved-protocol/approved-titration-form";
import { filterProtocolLibrary, ProtocolLibrary } from "@/components/approved-protocol/protocol-library";
import type { ApprovedProtocolPreset } from "@/lib/approved-protocol/types";

const source = JSON.parse(readFileSync("scripts/peptide-protocols-approved.json", "utf8"));
const entries = source.compounds.map((compound: { slug: string; name: string; kind: string }) => ({ catalogueEntryId: compound.slug, displayName: compound.name, slug: compound.slug, kind: compound.kind ?? "standalone" }));

describe("compact protocol editor", () => {
  it.each(["daily", "weekly", "days_per_week", "times_per_week", "as_needed", "interval", "interval_days"])("preserves the submitted %s frequency with three standard choices", (value) => {
    const html = renderToStaticMarkup(createElement(FrequencySelect, { name: "frequency", value, onChange: vi.fn() }));
    expect(html).toContain('name="frequency" value="' + value + '"');
    expect(html.match(/<option(?![^>]*disabled)[^>]*>/g)).toHaveLength(3);
    expect(html).toContain('value="weekly"');
    expect(html).not.toContain("Weekly — choose days");
    expect(html).not.toContain("Every N days");
    if (value.startsWith("interval")) expect(html).toContain('selected="">Interval schedule');
  });

  it.each(["weekly", "interval_days"] as const)("preserves saved custom %s fields under the simplified controls", (frequency) => {
    const html = renderToStaticMarkup(createElement(ProtocolForm, { catalogue: [{ id: "test", displayName: "Test" }], initial: { name: "Saved", description: null, durationDays: 28, schedules: [{ catalogueEntryId: "test", frequency, daysOfWeek: [1, 4, 0], intervalDays: 3, administrationsPerDay: 2, doseAmount: "0.4", doseUnit: "mg", startDay: 1, endDay: 28, timeOfDay: null }] } }));
    expect(html).toContain('name="schedule.0.frequency" value="' + frequency + '"');
    expect(html).toContain('name="schedule.0.administrationsPerDay" value="2"');
    if (frequency === "weekly") {
      expect(html).toContain('name="schedule.0.daysOfWeek" value="1,4,0"');
      expect(html.indexOf(">Mon</button>")).toBeLessThan(html.indexOf(">Sun</button>"));
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(3);
    } else {
      expect(html).toContain('name="schedule.0.intervalDays" value="3"');
      expect(html.indexOf("Every how many days?")).toBeGreaterThan(html.indexOf("<details"));
    }
  });

  it("preserves approved weekly and interval variants and Monday-first weekday values", () => {
    const compound = source.compounds.find((item: { slug: string }) => item.slug === "glow");
    for (const type of ["days_per_week", "times_per_week", "interval"]) {
      const definition = structuredClone(compound.protocols.most_used);
      definition.schedule[0].frequency = { ...definition.schedule[0].frequency, type, weekdays: ["monday", "sunday"], interval_days: 3 };
      const preset = { id: "test", displayName: compound.name, durationType: "fixed_cycle", definition } as ApprovedProtocolPreset;
      const html = renderToStaticMarkup(createElement(ApprovedTitrationForm, { preset, onboarding: false }));
      expect(html).toContain('name="stage.0.frequencyType" value="' + type + '"');
      if (type === "interval") {
        expect(html.match(/<input[^>]*name="stage.0.intervalDays"[^>]*>/)?.[0]).toContain('value="3"');
        expect(html.indexOf("Every how many days?")).toBeGreaterThan(html.indexOf("<details"));
      } else {
        expect(html.indexOf('aria-label="monday"')).toBeLessThan(html.indexOf('aria-label="sunday"'));
      }
    }
  });
});

describe("live protocol library filtering", () => {
  it("filters all 28 compounds by partial case-insensitive names and clears the search", () => {
    expect(entries).toHaveLength(28);
    expect(filterProtocolLibrary(entries, " Ret ").map((entry) => entry.slug)).toEqual(["retatrutide"]);
    expect(filterProtocolLibrary(entries, "no such compound")).toEqual([]);
    expect(filterProtocolLibrary(entries, "")).toHaveLength(28);
  });
  it("renders matching cards with onboarding links and an announced result count", () => {
    const html = renderToStaticMarkup(createElement(ProtocolLibrary, { entries, initialSearch: "Ret", onboarding: true }));
    expect(html).toContain('/templates/retatrutide?onboarding=1');
    expect(html).not.toContain('/templates/glow');
    expect(html).toContain('role="status">1 compound');
    expect(html).not.toContain('type="submit"');
  });
});
