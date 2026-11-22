import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import type { ApprovedProtocolPreset } from "@/lib/approved-protocol/types";

const prefix = `approved-test-${Date.now()}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let owner: AuthenticatedActor;
let other: AuthenticatedActor;
let approved: typeof import("@/lib/approved-protocol/service");
let copies: typeof import("@/lib/approved-protocol/copy-service");
let cycles: typeof import("@/lib/protocol-cycle/service");
let protocols: typeof import("@/lib/member-protocol/service");
let calendar: typeof import("@/lib/protocol-calendar/service");

function stagesFor(preset: ApprovedProtocolPreset, administrationOverride?: number) {
  return preset.definition.schedule.map((stage) => ({
    administrationsPerDay: administrationOverride ?? stage.frequency.administrations_per_day,
    doseAmount: String(stage.dose_amount),
    doseUnit: stage.dose_unit,
    endWeek: stage.end_week,
    frequencyType: stage.frequency.type,
    include: true,
    ingredientDoses: stage.ingredient_doses,
    intervalDays: stage.frequency.interval_days,
    route: stage.route,
    startWeek: stage.start_week,
    weekdays: stage.frequency.weekdays,
  }));
}

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  approved = await import("@/lib/approved-protocol/service");
  copies = await import("@/lib/approved-protocol/copy-service");
  cycles = await import("@/lib/protocol-cycle/service");
  protocols = await import("@/lib/member-protocol/service");
  calendar = await import("@/lib/protocol-calendar/service");
  await sql`insert into "user" (id, name, email, email_verified, role) values
    (${ownerId}, 'Approved owner', ${`${prefix}-owner@example.test`}, true, 'member'),
    (${otherId}, 'Approved other', ${`${prefix}-other@example.test`}, true, 'member')`;
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;
});

afterAll(async () => {
  await sql`delete from "user" where id in (${ownerId}, ${otherId})`;
  await sql.end();
});

describe("approved protocol private copies", () => {
  it("keeps the approved preset immutable and uses exact day duration", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("epitalon"))[0];
    const sourceBefore = JSON.stringify(preset.definition);
    const copy = await copies.createApprovedProtocolCopy(owner, {
      description: "Private customised copy", durationDays: 10, name: "Epitalon private",
      presetId: preset.id, stages: stagesFor(preset),
    });
    const saved = await protocols.getMemberProtocol(owner, copy.protocolId);
    expect(saved).toMatchObject({ durationDays: 10, durationType: "fixed_cycle", origin: "approved_preset", ownerUserId: ownerId });
    expect(JSON.stringify((await approved.getApprovedProtocolPreset(preset.id))?.definition)).toBe(sourceBefore);
    await expect(protocols.getMemberProtocol(other, copy.protocolId)).rejects.toMatchObject({ status: 403 });
    const cycle = await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-11-01" });
    expect(cycle.plannedEndDate).toBe("2026-11-10");
  });

  it("continues open-ended phases without materialising infinite records", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("retatrutide"))[0];
    const copy = await copies.createApprovedProtocolCopy(owner, { description: null, durationDays: null, name: "Open private", presetId: preset.id, stages: stagesFor(preset) });
    const cycle = await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-01-01" });
    expect(cycle.plannedEndDate).toBeNull();
    expect(await calendar.getScheduledEvents(owner, "2026-12-31", "2026-12-31")).toHaveLength(1);
  });

  it("splits combined daily mass into distinct configured administrations", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("cjc-1295-no-dac-ipamorelin"))[0];
    const copy = await copies.createApprovedProtocolCopy(owner, { description: null, durationDays: 56, name: "Daily total private", presetId: preset.id, stages: stagesFor(preset, 2) });
    await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-05-01" });
    const events = (await calendar.getScheduledEvents(owner, "2026-05-01", "2026-05-01")).filter((event) => event.cycleName === "Daily total private");
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.doseAmount)).toEqual(["100.0000", "100.0000"]);
  });
});
