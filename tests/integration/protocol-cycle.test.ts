import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `p04-test-${Date.now()}`;
const adminId = `${prefix}-admin`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let cycles: typeof import("@/lib/protocol-cycle/service");
let protocols: typeof import("@/lib/member-protocol/service");
let templates: typeof import("@/lib/protocol-template/service");
let admin: AuthenticatedActor;
let owner: AuthenticatedActor;
let other: AuthenticatedActor;
let templateId = "";
let templateVersionId = "";
let protocolId = "";
let cycleId = "";
let repeatedCycleId = "";

const schedules = [
  {
    catalogueEntryId: "catalogue-wolverine-blend",
    daysOfWeek: [],
    doseAmount: "1.0000",
    doseUnit: "mg",
    endDay: 28,
    frequency: "daily" as const,
    intervalDays: null,
    startDay: 1,
    timeOfDay: "08:00",
  },
  {
    catalogueEntryId: "catalogue-semax",
    daysOfWeek: [1, 3, 5],
    doseAmount: "0.5000",
    doseUnit: "mg",
    endDay: 28,
    frequency: "weekly" as const,
    intervalDays: null,
    startDay: 1,
    timeOfDay: "18:00",
  },
];

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  cycles = await import("@/lib/protocol-cycle/service");
  protocols = await import("@/lib/member-protocol/service");
  templates = await import("@/lib/protocol-template/service");

  await sql`
    insert into "user" (id, name, email, email_verified, role)
    values
      (${adminId}, 'P04 admin', ${`${prefix}-admin@example.test`}, true, 'admin'),
      (${ownerId}, 'P04 owner', ${`${prefix}-owner@example.test`}, true, 'member'),
      (${otherId}, 'P04 other', ${`${prefix}-other@example.test`}, true, 'member')
  `;
  admin = { userId: adminId, role: "admin" } as AuthenticatedActor;
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;

  const template = await templates.createProtocolTemplate(admin, {
    description: "Integration-only P04 source.",
    durationDays: 28,
    name: "P04 source template",
    schedules,
    slug: `${prefix}-source`,
  });
  templateId = template.templateId;
  templateVersionId = template.versionId;
  await templates.publishProtocolTemplateVersion(admin, templateVersionId);
  const protocol = await protocols.copyPublishedTemplateToProtocol(
    owner,
    templateVersionId,
    {
      description: "Private P04 source protocol.",
      durationDays: 28,
      name: "P04 saved protocol",
      schedules,
    },
  );
  protocolId = protocol.protocolId;
});

afterAll(async () => {
  await sql`delete from protocol_cycle where owner_user_id = ${ownerId}`;
  if (protocolId) await sql`delete from member_protocol where id = ${protocolId}`;
  if (templateId) await sql`delete from protocol_template where id = ${templateId}`;
  await sql`delete from "user" where id in (${adminId}, ${ownerId}, ${otherId})`;
  await sql.end();
});

describe("independent protocol cycles", () => {
  it("starts independent cycles with schedule snapshots and provenance", async () => {
    const first = await cycles.startProtocolCycle(owner, {
      protocolId,
      startDate: "2026-01-01",
    });
    const repeated = await cycles.startProtocolCycle(owner, {
      protocolId,
      startDate: "2026-02-01",
    });
    cycleId = first.cycleId;
    repeatedCycleId = repeated.cycleId;
    expect(first).toMatchObject({ plannedEndDate: "2026-01-28" });
    expect(repeated).toMatchObject({ plannedEndDate: "2026-02-28" });
    expect(repeatedCycleId).not.toBe(cycleId);

    const cycle = await cycles.getProtocolCycle(owner, cycleId);
    const repeat = await cycles.getProtocolCycle(owner, repeatedCycleId);
    expect(cycle).toMatchObject({
      firstDeviatedOn: null,
      sourceProtocolId: protocolId,
      sourceTemplateId: templateId,
      sourceTemplateVersionId: templateVersionId,
      status: "active",
      templateInitiallyMatching: true,
    });
    expect(cycle?.revisions).toHaveLength(1);
    expect(cycle?.revisions[0].steps).toHaveLength(2);
    expect(repeat?.revisions[0].id).not.toBe(cycle?.revisions[0].id);
  });

  it("records pause and resume interruptions", async () => {
    await cycles.pauseProtocolCycle(owner, cycleId, "2026-01-05");
    let cycle = await cycles.getProtocolCycle(owner, cycleId);
    expect(cycle).toMatchObject({ status: "paused" });
    expect(cycle?.pauses).toEqual([
      expect.objectContaining({ pausedOn: "2026-01-05", resumedOn: null }),
    ]);
    await expect(
      cycles.reviseProtocolCycleSchedule(owner, cycleId, "2026-01-10", schedules),
    ).rejects.toMatchObject({ code: "conflict" });

    await cycles.resumeProtocolCycle(owner, cycleId, "2026-01-07");
    cycle = await cycles.getProtocolCycle(owner, cycleId);
    expect(cycle).toMatchObject({ status: "active" });
    expect(cycle?.pauses[0]).toMatchObject({ resumedOn: "2026-01-07" });
    await expect(cycles.pauseProtocolCycle(owner, cycleId, "2026-01-06")).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("appends a revision and preserves earlier matching history", async () => {
    const revisedSchedules = [
      ...schedules,
      { ...schedules[1], doseAmount: "0.2500", endDay: 28, startDay: 15 },
    ];
    const revision = await cycles.reviseProtocolCycleSchedule(
      owner,
      cycleId,
      "2026-01-15",
      revisedSchedules,
    );
    expect(revision).toMatchObject({
      revisionNumber: 2,
      templateScheduleMatches: false,
    });
    const cycle = await cycles.getProtocolCycle(owner, cycleId);
    expect(cycle).toMatchObject({
      firstDeviatedOn: "2026-01-15",
      sourceTemplateId: templateId,
      sourceTemplateVersionId: templateVersionId,
    });
    expect(cycle?.revisions).toHaveLength(2);
    expect(cycle?.revisions[0].steps).toHaveLength(2);
    expect(cycle?.revisions[1].steps).toHaveLength(3);
    expect(cycles.completeMatchingWeeksBeforeDeviation(cycle!)).toBe(2);

    const source = await templates.getProtocolTemplateForAdmin(
      admin,
      templateId,
      templateVersionId,
    );
    expect(source?.steps).toHaveLength(2);
  });

  it("enforces terminal states and account isolation", async () => {
    await expect(cycles.getProtocolCycle(other, cycleId)).rejects.toMatchObject({ status: 403 });
    await expect(
      cycles.startProtocolCycle(other, { protocolId, startDate: "2026-03-01" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      cycles.pauseProtocolCycle(other, cycleId, "2026-01-20"),
    ).rejects.toMatchObject({ status: 403 });

    await cycles.pauseProtocolCycle(owner, cycleId, "2026-01-20");
    await cycles.endProtocolCycle(owner, cycleId, "completed", "2026-01-21");
    expect(await cycles.getProtocolCycle(owner, cycleId)).toMatchObject({
      endedOn: "2026-01-21",
      status: "completed",
    });
    await expect(cycles.resumeProtocolCycle(owner, cycleId, "2026-01-22")).rejects.toMatchObject({
      code: "conflict",
    });

    await cycles.endProtocolCycle(owner, repeatedCycleId, "cancelled", "2026-02-03");
    expect(await cycles.getProtocolCycle(owner, repeatedCycleId)).toMatchObject({
      endedOn: "2026-02-03",
      status: "cancelled",
    });
    expect(await cycles.getProtocolCycles(other)).toHaveLength(0);
  });
});
