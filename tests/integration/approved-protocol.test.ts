import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import { formatApprovedDecimal } from "@/lib/approved-protocol/decimal";
import type { ApprovedProtocolDefinition, ApprovedProtocolPreset } from "@/lib/approved-protocol/types";

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
let injections: typeof import("@/lib/injection/service");

const weekdayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function exactDurationDays(preset: ApprovedProtocolPreset) {
  if (preset.durationType !== "fixed_cycle") return null;
  return preset.definition.duration_days ?? Math.round((preset.definition.duration_weeks ?? 0) * 7);
}

function stagesFor(preset: ApprovedProtocolPreset, options: { administrationOverride?: number; completeUnspecified?: boolean } = {}) {
  return preset.definition.schedule.map((stage) => ({
    administrationsPerDay: options.administrationOverride ?? stage.frequency.administrations_per_day ?? (options.completeUnspecified && stage.dose_basis === "combined_daily_mass" ? 1 : null),
    doseAmount: formatApprovedDecimal(stage.dose_amount),
    doseUnit: stage.dose_unit,
    endWeek: stage.end_week,
    frequencyType: stage.frequency.type,
    include: true,
    ingredientDoses: stage.ingredient_doses.map((ingredient) => ({
      doseAmount: formatApprovedDecimal(ingredient.dose_amount),
      doseUnit: ingredient.dose_unit,
      name: ingredient.name,
    })),
    intervalDays: stage.frequency.interval_days,
    route: options.completeUnspecified && (stage.route === "not_reported" || stage.route === "injection_unspecified") ? "subcutaneous" : stage.route,
    startWeek: stage.start_week,
    weekdays: stage.frequency.weekdays.length || !options.completeUnspecified
      ? stage.frequency.weekdays
      : weekdayNames.slice(0, stage.frequency.days_per_week ?? stage.frequency.administrations_per_week ?? 0),
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
  injections = await import("@/lib/injection/service");
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
  it.each([0, 1, 2, 3])("saves Retatrutide after editing stage order %i and recalculating boundaries", async (deleted) => {
    const preset = (await approved.getApprovedProtocolsBySlug("retatrutide")).find((entry) => entry.category === "most_used")!;
    const source = stagesFor(preset);
    const removed = deleted === 2 ? source.length - 1 : deleted;
    const stages = source.map((stage, sourceIndex) => ({ ...stage, sourceIndex })).filter((_, index) => deleted === 3 || index !== removed);
    if (deleted === 3) stages.reverse();
    let day = 1;
    for (const [index, stage] of stages.entries()) {
      const length = stage.endWeek === null ? 28 : Math.round(stage.endWeek * 7 - (stage.startWeek - 1) * 7);
      stage.startWeek = (day - 1) / 7 + 1;
      stage.endWeek = index === stages.length - 1 ? null : (day + length - 1) / 7;
      day += length;
    }
    const copy = await copies.createApprovedProtocolCopy(owner, { description: null, durationDays: null, name: "Retatrutide deleted stage", presetId: preset.id, stages });
    const saved = await protocols.getMemberProtocol(owner, copy.protocolId);
    expect(saved?.steps).toHaveLength(stages.length);
    expect(saved?.steps.map((step) => Number(step.doseAmount))).toEqual(stages.map((stage) => Number(stage.doseAmount)));
    const cycle = await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-11-01" });
    for (const step of saved!.steps) {
      const date = calendar.addCalendarDays("2026-11-01", step.startDay - 1);
      const events = (await calendar.getScheduledEvents(owner, date, date)).filter((event) => event.cycleId === cycle.cycleId);
      expect(events[0]?.doseAmount).toBe(step.doseAmount);
    }
  });
  it("rejects removing every approved stage without writing a draft", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("retatrutide"))[0];
    await expect(copies.createApprovedProtocolCopy(owner, { description: null, durationDays: null, name: "Empty titration", presetId: preset.id, stages: [] })).rejects.toThrow("Add between 1 and 100");
  });
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

  it("saves added exact-day titration stages without rounding them to weeks", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("epitalon")).find((entry) => entry.category === "most_used")!;
    const source = stagesFor(preset)[0];
    const copy = await copies.createApprovedProtocolCopy(owner, {
      description: null,
      durationDays: 15,
      name: "Epitalon exact-day stages",
      presetId: preset.id,
      stages: [
        { ...structuredClone(source), sourceIndex: 0, startWeek: 1, endWeek: 5 / 7 },
        { ...structuredClone(source), sourceIndex: 0, startWeek: 12 / 7, endWeek: 15 / 7 },
      ],
    });
    const saved = await protocols.getMemberProtocol(owner, copy.protocolId);
    expect(saved?.steps.map((step) => [step.startDay, step.endDay])).toEqual([[1, 5], [6, 15]]);
  });

  it("continues open-ended phases without materialising infinite records", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("retatrutide"))[0];
    const copy = await copies.createApprovedProtocolCopy(owner, { description: null, durationDays: null, name: "Open private", presetId: preset.id, stages: stagesFor(preset) });
    const cycle = await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-01-01" });
    expect(cycle.plannedEndDate).toBeNull();
    expect(await calendar.getScheduledEvents(owner, "2026-12-31", "2026-12-31")).toHaveLength(1);
    expect((await injections.getDashboardInjectionActions(owner, "2026-12-31")).todayActions).toHaveLength(1);
  });

  it("splits combined daily mass into distinct configured administrations", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("cjc-1295-no-dac-ipamorelin"))[0];
    const copy = await copies.createApprovedProtocolCopy(owner, { description: null, durationDays: 56, name: "Daily total private", presetId: preset.id, stages: stagesFor(preset, { administrationOverride: 2 }) });
    await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-05-01" });
    const events = (await calendar.getScheduledEvents(owner, "2026-05-01", "2026-05-01")).filter((event) => event.cycleName === "Daily total private");
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.doseAmount)).toEqual(["100.0000", "100.0000"]);
  });

  it("saves GLOW Most Used unchanged and keeps exact 56-day duration", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("glow")).find((entry) => entry.category === "most_used")!;
    const glowStages = stagesFor(preset);
    // Simulate stale hidden/form values: daily schedules must serialize without them.
    glowStages[0].weekdays = ["monday"];
    glowStages[0].intervalDays = 3;
    const copy = await copies.createApprovedProtocolCopy(owner, {
      description: null,
      durationDays: exactDurationDays(preset),
      name: "GLOW Most Used unchanged",
      presetId: preset.id,
      stages: glowStages,
    });
    const saved = await protocols.getMemberProtocol(owner, copy.protocolId);
    expect(saved).toMatchObject({ durationDays: 56, durationType: "fixed_cycle", origin: "approved_preset" });
    expect(saved?.steps[0]).toMatchObject({ doseAmount: "2.8000", doseUnit: "mg" });
    expect(saved?.steps[0].ingredientDoses).toEqual([
      { name: "GHK-Cu", dose_amount: 2, dose_unit: "mg" },
      { name: "BPC-157", dose_amount: 0.4, dose_unit: "mg" },
      { name: "TB-500", dose_amount: 0.4, dose_unit: "mg" },
    ]);
    expect(saved?.steps[0]).toMatchObject({ daysOfWeek: [], frequency: "daily", intervalDays: null });
    // Legacy rows may contain stale values; cycle creation must also canonicalize them.
    await sql`
      update member_protocol_schedule_step step set days_of_week = array[1, 3], interval_days = 4
      from member_protocol_entry entry
      where step.protocol_entry_id = entry.id and entry.protocol_id = ${copy.protocolId}
    `;
    const cycle = await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-11-16" });
    expect(cycle.plannedEndDate).toBe("2027-01-10");
    // Reproduce legacy data where the first revision was stamped on the creation date.
    await sql`update protocol_cycle_schedule_revision set effective_from = '2026-11-23' where cycle_id = ${cycle.cycleId} and revision_number = 1`;
    const [cycleStep] = await sql<{ daysOfWeek: number[]; frequency: string; intervalDays: number | null }[]>`
      select step.days_of_week as "daysOfWeek", step.frequency, step.interval_days as "intervalDays"
      from protocol_cycle_schedule_step step
      join protocol_cycle_schedule_entry entry on entry.id = step.revision_entry_id
      join protocol_cycle_schedule_revision revision on revision.id = entry.revision_id
      where revision.cycle_id = ${cycle.cycleId}
      limit 1
    `;
    expect(cycleStep).toEqual({ daysOfWeek: [], frequency: "daily", intervalDays: null });
    const week = await calendar.getWeeklySchedule(owner, "2026-11-16");
    expect(week.filter((event) => event.cycleId === cycle.cycleId).map((event) => event.date)).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
    const month = (await calendar.getMonthlySchedule(owner, "2026-11-16")).filter((event) => event.cycleId === cycle.cycleId);
    expect(month).toHaveLength(15);
    expect(month.at(0)?.date).toBe("2026-11-16");
    expect(month.at(-1)?.date).toBe("2026-11-30");
    const actions = (await injections.getCalendarInjectionActions(owner, "2026-11-16", "2026-11-30", "2026-11-23"))
      .filter((action) => action.event.cycleId === cycle.cycleId);
    expect(actions.filter((action) => action.state === "overdue").map((action) => action.event.date)).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
    expect(actions.find((action) => action.event.date === "2026-11-23")?.state).toBe("pending");
  });

  it("accepts equivalent mixed-unit blend masses and still rejects real mismatches", async () => {
    const preset = (await approved.getApprovedProtocolsBySlug("wolverine-blend"))[0];
    const input = {
      description: null,
      durationDays: exactDurationDays(preset),
      name: "Wolverine mixed units",
      presetId: preset.id,
      stages: stagesFor(preset),
    };
    await expect(copies.createApprovedProtocolCopy(owner, input)).resolves.toHaveProperty("protocolId");
    const mismatched = structuredClone(input);
    mismatched.name = "Wolverine mismatch";
    mismatched.stages[0].ingredientDoses[0].doseAmount = "0.1249";
    await expect(copies.createApprovedProtocolCopy(owner, mismatched)).rejects.toThrow("ingredient doses must equal the combined dose");
  });

  it("saves all 84 approved presets without changing supplied doses or durations", async () => {
    const catalogue = await approved.getApprovedProtocolCatalogue();
    expect(catalogue).toHaveLength(28);
    const passed: string[] = [];
    const failures: string[] = [];

    for (const compound of catalogue) {
      const presets = await approved.getApprovedProtocolsBySlug(compound.slug);
      expect(presets).toHaveLength(3);
      for (const preset of presets) {
        const key = `${preset.catalogueSlug}:${preset.category}`;
        try {
          const durationDays = exactDurationDays(preset);
          const copy = await copies.createApprovedProtocolCopy(owner, {
            description: "84-preset unchanged-copy audit",
            durationDays,
            name: `Audit ${key}`,
            presetId: preset.id,
            // These choices exist only where the approved source explicitly asks the member
            // to choose a route, weekdays, or administrations per day.
            stages: stagesFor(preset, { completeUnspecified: true }),
          });
          const saved = await protocols.getMemberProtocol(owner, copy.protocolId);
          if (!saved) throw new Error("saved protocol is missing");
          if (saved.steps.length !== preset.definition.schedule.length) throw new Error(`saved ${saved.steps.length} of ${preset.definition.schedule.length} stages`);
          if (saved.durationDays !== durationDays) throw new Error(`duration changed from ${durationDays} to ${saved.durationDays}`);
          const [snapshot] = await sql<{ approvedDefinition: ApprovedProtocolDefinition }[]>`
            select approved_definition as "approvedDefinition"
            from member_protocol where id = ${copy.protocolId}
          `;
          if (!snapshot) throw new Error("saved approved snapshot is missing");
          for (const [index, sourceStage] of preset.definition.schedule.entries()) {
            const savedStage = snapshot.approvedDefinition.schedule[index];
            const scheduleStep = saved.steps[index];
            if (!savedStage || !scheduleStep) throw new Error(`stage ${index + 1} is missing`);
            if (formatApprovedDecimal(savedStage.dose_amount) !== formatApprovedDecimal(sourceStage.dose_amount) || savedStage.dose_unit !== sourceStage.dose_unit) throw new Error(`stage ${index + 1} dose changed`);
            if (savedStage.ingredient_doses.length !== sourceStage.ingredient_doses.length) throw new Error(`stage ${index + 1} ingredient count changed`);
            for (const [ingredientIndex, sourceIngredient] of sourceStage.ingredient_doses.entries()) {
              const savedIngredient = savedStage.ingredient_doses[ingredientIndex];
              if (!savedIngredient || savedIngredient.name !== sourceIngredient.name || savedIngredient.dose_unit !== sourceIngredient.dose_unit || formatApprovedDecimal(savedIngredient.dose_amount) !== formatApprovedDecimal(sourceIngredient.dose_amount)) throw new Error(`stage ${index + 1} ingredient ${sourceIngredient.name} changed`);
            }
            if (sourceStage.dose_basis !== "combined_daily_mass" && formatApprovedDecimal(Number(scheduleStep.doseAmount)) !== formatApprovedDecimal(sourceStage.dose_amount)) throw new Error(`stage ${index + 1} persisted dose changed`);
            if (scheduleStep.doseBasis !== sourceStage.dose_basis) throw new Error(`stage ${index + 1} dose basis changed`);
          }
          const cycle = await cycles.startProtocolCycle(owner, { protocolId: copy.protocolId, startDate: "2026-01-01" });
          const expectedEndDate = durationDays === null ? null : new Date(Date.UTC(2026, 0, durationDays)).toISOString().slice(0, 10);
          if (cycle.plannedEndDate !== expectedEndDate) throw new Error(`cycle duration changed from ${expectedEndDate} to ${cycle.plannedEndDate}`);
          if (preset.durationType === "as_needed") {
            const events = (await calendar.getScheduledEvents(owner, "2026-01-01", "2026-02-28")).filter((event) => event.cycleId === cycle.cycleId);
            if (events.length) throw new Error(`as-needed cycle generated ${events.length} automatic dates`);
          }
          passed.push(key);
        } catch (error) {
          failures.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    expect(failures).toEqual([]);
    expect(passed).toHaveLength(84);
    for (const slug of ["glow", "klow", "wolverine-blend", "cjc-1295-no-dac-ipamorelin", "tesamorelin-ipamorelin"]) {
      expect(passed.filter((key) => key.startsWith(`${slug}:`))).toHaveLength(3);
    }
    const glowMostUsed = await approved.getApprovedProtocolPreset("approved:glow:most_used");
    expect(exactDurationDays(glowMostUsed!)).toBe(56);
  }, 30_000);
});
