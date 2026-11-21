import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `p02-test-${Date.now()}`;
const adminId = `${prefix}-admin`;
const memberId = `${prefix}-member`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let service: typeof import("@/lib/protocol-template/service");
let admin: AuthenticatedActor;
let member: AuthenticatedActor;
let templateId: string;
let publishedVersionId: string;

const schedules = [
  {
    catalogueEntryId: "catalogue-bpc-157",
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
    catalogueEntryId: "catalogue-tb-500",
    daysOfWeek: [1, 4],
    doseAmount: "2.5000",
    doseUnit: "mg",
    endDay: 28,
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
  service = await import("@/lib/protocol-template/service");

  await sql`
    insert into "user" (id, name, email, email_verified, role)
    values
      (${adminId}, 'Protocol admin', ${`${prefix}-admin@example.test`}, true, 'admin'),
      (${memberId}, 'Protocol member', ${`${prefix}-member@example.test`}, true, 'member')
  `;
  admin = { userId: adminId, role: "admin" } as AuthenticatedActor;
  member = { userId: memberId, role: "member" } as AuthenticatedActor;
});

afterAll(async () => {
  if (templateId) await sql`delete from protocol_template where id = ${templateId}`;
  await sql`delete from "user" where id in (${adminId}, ${memberId})`;
  await sql.end();
});

describe("versioned protocol templates", () => {
  it("rejects member creation and creates an administrator draft", async () => {
    const input = {
      description: "Multi-peptide integration template.",
      durationDays: 28,
      name: "Integration template",
      schedules,
      slug: `${prefix}-template`,
    };

    await expect(service.createProtocolTemplate(member, input)).rejects.toMatchObject({
      status: 403,
    });
    const result = await service.createProtocolTemplate(admin, input);
    templateId = result.templateId;
    publishedVersionId = result.versionId;

    const draft = await service.getProtocolTemplateForAdmin(admin, templateId);
    expect(draft).toMatchObject({ status: "draft", versionNumber: 1 });
    expect(draft?.entries.map((entry) => entry.catalogueEntryId)).toEqual([
      "catalogue-bpc-157",
      "catalogue-tb-500",
    ]);
    expect(draft?.steps).toHaveLength(2);
    expect(draft?.steps.every((step) => step.timeOfDay === "08:00")).toBe(true);
  });

  it("edits a draft in place and publishes it", async () => {
    const updated = await service.updateProtocolTemplateVersion(admin, publishedVersionId, {
      description: "Approved version one content.",
      durationDays: 28,
      name: "Integration template v1",
      schedules,
    });
    expect(updated).toMatchObject({ createdNewVersion: false, versionNumber: 1 });

    await service.publishProtocolTemplateVersion(admin, publishedVersionId);
    const published = await service.getPublishedProtocolTemplateBySlug(`${prefix}-template`);
    expect(published).toMatchObject({
      description: "Approved version one content.",
      status: "published",
      versionNumber: 1,
    });
  });

  it("keeps member access read-only and versions published edits", async () => {
    await expect(
      service.updateProtocolTemplateVersion(member, publishedVersionId, {
        description: "Member edit",
        durationDays: 28,
        name: "Not allowed",
        schedules,
      }),
    ).rejects.toMatchObject({ status: 403 });

    const next = await service.updateProtocolTemplateVersion(admin, publishedVersionId, {
      description: "Version two draft content.",
      durationDays: 35,
      name: "Integration template v2",
      schedules: [
        ...schedules,
        { ...schedules[0], doseAmount: "0.5000", startDay: 8, endDay: 35 },
      ],
    });
    expect(next).toMatchObject({ createdNewVersion: true, versionNumber: 2 });

    const original = await service.getProtocolTemplateForAdmin(
      admin,
      templateId,
      publishedVersionId,
    );
    expect(original).toMatchObject({
      description: "Approved version one content.",
      durationDays: 28,
      name: "Integration template v1",
      status: "published",
      versionNumber: 1,
    });
    expect(original?.steps).toHaveLength(2);

    const draft = await service.getProtocolTemplateForAdmin(admin, templateId, next.versionId);
    expect(draft).toMatchObject({ durationDays: 35, status: "draft", versionNumber: 2 });
    expect(draft?.steps).toHaveLength(3);
    expect(await service.getPublishedProtocolTemplateBySlug(`${prefix}-template`)).toMatchObject({
      versionNumber: 1,
    });

    await service.publishProtocolTemplateVersion(admin, next.versionId);
    expect(await service.getPublishedProtocolTemplateBySlug(`${prefix}-template`)).toMatchObject({
      versionNumber: 2,
    });
  });

  it("supports retirement without changing version content", async () => {
    await service.retireProtocolTemplateVersion(admin, publishedVersionId);
    const retired = await service.getProtocolTemplateForAdmin(admin, templateId, publishedVersionId);
    expect(retired).toMatchObject({
      description: "Approved version one content.",
      durationDays: 28,
      status: "retired",
      versionNumber: 1,
    });
    expect(retired?.steps).toHaveLength(2);
  });
});
