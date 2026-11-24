import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `p03-test-${Date.now()}`;
const adminId = `${prefix}-admin`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let protocols: typeof import("@/lib/member-protocol/service");
let templates: typeof import("@/lib/protocol-template/service");
let admin: AuthenticatedActor;
let owner: AuthenticatedActor;
let other: AuthenticatedActor;
let templateId = "";
let templateVersionId = "";
let manualProtocolId = "";
let copiedProtocolId = "";

const schedules = [
  {
    catalogueEntryId: "catalogue-wolverine-blend",
    daysOfWeek: [],
    doseAmount: "1.0000",
    doseUnit: "mg",
    endDay: 21,
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
    endDay: 21,
    frequency: "weekly" as const,
    intervalDays: null,
    startDay: 1,
    timeOfDay: "08:00",
  },
];

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  protocols = await import("@/lib/member-protocol/service");
  templates = await import("@/lib/protocol-template/service");

  await sql`
    insert into "user" (id, name, email, email_verified, role)
    values
      (${adminId}, 'P03 admin', ${`${prefix}-admin@example.test`}, true, 'admin'),
      (${ownerId}, 'P03 owner', ${`${prefix}-owner@example.test`}, true, 'member'),
      (${otherId}, 'P03 other', ${`${prefix}-other@example.test`}, true, 'member')
  `;
  admin = { userId: adminId, role: "admin" } as AuthenticatedActor;
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;

  const template = await templates.createProtocolTemplate(admin, {
    description: "Integration-only source template.",
    durationDays: 21,
    name: "P03 source template",
    schedules,
    slug: `${prefix}-source`,
  });
  templateId = template.templateId;
  templateVersionId = template.versionId;
  await templates.publishProtocolTemplateVersion(admin, templateVersionId);
});

afterAll(async () => {
  await sql`delete from protocol_cycle where owner_user_id = ${ownerId}`;
  if (ownerId) await sql`delete from member_protocol where owner_user_id = ${ownerId}`;
  if (templateId) await sql`delete from protocol_template where id = ${templateId}`;
  await sql`delete from "user" where id in (${adminId}, ${ownerId}, ${otherId})`;
  await sql.end();
});

describe("private member protocols", () => {
  it("keeps custom blends private and starts an independent cycle", async () => {
    const { createPrivateCompound } = await import("@/lib/catalogue/private-compound");
    const catalogue = await import("@/lib/catalogue/service");
    const compound = await createPrivateCompound(owner, { name: "Private test blend", kind: "blend", ingredients: "First ingredient\nSecond ingredient" });
    expect((await catalogue.getCatalogueEntries()).some((entry) => entry.id === compound.id)).toBe(false);
    expect((await catalogue.getCatalogueEntries({ ownerUserId: otherId })).some((entry) => entry.id === compound.id)).toBe(false);
    expect((await catalogue.getCatalogueEntries({ ownerUserId: ownerId })).some((entry) => entry.id === compound.id)).toBe(true);
    const [row] = await sql<{ slug: string }[]>`select slug from catalogue_entry where id = ${compound.id}`;
    expect(await catalogue.getCatalogueEntryBySlug(row.slug, true)).toBeNull();
    const input = { description: null, durationDays: 21, name: "Custom private blend", schedules: [{ ...schedules[0], catalogueEntryId: compound.id, doseBasis: "combined_blend_mass", ingredientDoses: [{ name: "First ingredient", dose_amount: "0.4", dose_unit: "mg" }, { name: "Second ingredient", dose_amount: "0.6", dose_unit: "mg" }] }] };
    await expect(protocols.createMemberProtocol(other, input)).rejects.toMatchObject({ code: "invalid" });
    const draft = await protocols.createMemberProtocol(owner, input);
    const { startProtocolCycle } = await import("@/lib/protocol-cycle/service");
    const cycle = await startProtocolCycle(owner, { protocolId: draft.protocolId, startDate: "2026-11-24" });
    expect(cycle.cycleId).toBeTruthy();
    await expect(startProtocolCycle(other, { protocolId: draft.protocolId, startDate: "2026-11-24" })).rejects.toBeDefined();
    const [count] = await sql<{ count: number }[]>`select count(*)::int as count from catalogue_entry where owner_user_id is null`;
    expect(count.count).toBe(28);
  });
  it("creates a manual multi-peptide draft with overlapping schedules", async () => {
    const result = await protocols.createMemberProtocol(owner, {
      description: "Private custom draft.",
      durationDays: 21,
      name: "Manual integration protocol",
      schedules,
    });
    manualProtocolId = result.protocolId;
    expect(result.templateScheduleUnchanged).toBe(false);

    const protocol = await protocols.getMemberProtocol(owner, manualProtocolId);
    expect(protocol).toMatchObject({
      origin: "custom",
      ownerUserId: ownerId,
      sourceTemplateId: null,
      sourceTemplateVersionId: null,
      status: "draft",
      templateScheduleUnchanged: false,
    });
    expect(protocol?.entries).toHaveLength(2);
    expect(protocol?.steps).toHaveLength(2);
    expect(protocol?.steps.every((step) => step.startDay === 1)).toBe(true);
  });

  it("copies an exact published version and preserves its source", async () => {
    const result = await protocols.copyPublishedTemplateToProtocol(owner, templateVersionId, {
      description: "Private template copy.",
      durationDays: 21,
      name: "Copied integration protocol",
      schedules: [...schedules].reverse(),
    });
    copiedProtocolId = result.protocolId;
    expect(result.templateScheduleUnchanged).toBe(true);

    const copied = await protocols.getMemberProtocol(owner, copiedProtocolId);
    expect(copied).toMatchObject({
      origin: "template",
      sourceTemplateId: templateId,
      sourceTemplateVersionId: templateVersionId,
      sourceTemplateVersionNumber: 1,
      templateScheduleUnchanged: true,
    });
  });

  it("customises only the private copy and retains provenance", async () => {
    await protocols.updateMemberProtocol(owner, copiedProtocolId, {
      description: "Customised private template copy.",
      durationDays: 28,
      name: "Copied integration protocol",
      schedules: [
        ...schedules,
        { ...schedules[1], doseAmount: "0.2500", endDay: 28, startDay: 8 },
      ],
    });
    const copied = await protocols.getMemberProtocol(owner, copiedProtocolId);
    expect(copied).toMatchObject({
      durationDays: 28,
      sourceTemplateId: templateId,
      sourceTemplateVersionId: templateVersionId,
      templateScheduleUnchanged: false,
    });
    expect(copied?.steps).toHaveLength(3);

    const source = await templates.getProtocolTemplateForAdmin(
      admin,
      templateId,
      templateVersionId,
    );
    expect(source).toMatchObject({ durationDays: 21, status: "published" });
    expect(source?.steps).toHaveLength(2);
  });

  it("enforces ownership for reads, updates and deletes", async () => {
    await expect(protocols.getMemberProtocol(other, manualProtocolId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      protocols.updateMemberProtocol(other, manualProtocolId, {
        description: null,
        durationDays: 21,
        name: "Cross-account edit",
        schedules,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(protocols.deleteMemberProtocol(other, manualProtocolId)).rejects.toMatchObject({
      status: 403,
    });
    expect(await protocols.getMemberProtocols(other)).toHaveLength(0);

    await protocols.deleteMemberProtocol(owner, manualProtocolId);
    await expect(protocols.getMemberProtocol(owner, manualProtocolId)).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
