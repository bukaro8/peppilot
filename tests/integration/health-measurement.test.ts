import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `h01-test-${Date.now()}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let service: typeof import("@/lib/health/measurement-service");
let owner: AuthenticatedActor;
let other: AuthenticatedActor;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  sql = (await import("@/lib/db")).getPostgresClient();
  service = await import("@/lib/health/measurement-service");
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;
  await sql`insert into "user" (id, name, email, email_verified, role) values (${ownerId}, 'H01 owner', ${`${prefix}-owner@example.test`}, true, 'member'), (${otherId}, 'H01 other', ${`${prefix}-other@example.test`}, true, 'member')`;
});

afterAll(async () => {
  await sql`delete from "user" where id in (${ownerId}, ${otherId})`;
  await sql.end();
});

describe("private health measurements", () => {
  it("creates canonical measurements and makes repeated requests idempotent", async () => {
    await service.createHealthMeasurement(owner, { id: firstId, metricId: "weight", observedOn: "2026-11-01", unit: "lb", value: "220.4623", notes: "Morning" });
    await service.createHealthMeasurement(owner, { id: firstId, metricId: "weight", observedOn: "2026-11-01", unit: "lb", value: "220.4623" });
    expect(await service.getHealthMeasurement(owner, firstId)).toMatchObject({
      canonicalUnit: "kg", canonicalValue: "100.0000", enteredUnit: "lb",
      enteredValue: "220.4623", metricId: "weight", notes: "Morning",
    });
    expect(await service.listHealthMeasurements(owner)).toHaveLength(1);
  });

  it("supports multiple measurements on the same day", async () => {
    await service.createHealthMeasurement(owner, { id: secondId, metricId: "waist_circumference", observedOn: "2026-11-01", unit: "in", value: "40" });
    const rows = await service.listHealthMeasurements(owner);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.observedOn === "2026-11-01")).toBe(true);
    expect(rows.find((row) => row.id === secondId)).toMatchObject({ canonicalUnit: "cm", canonicalValue: "101.6000" });
  });

  it("edits values and units without attaching them to a protocol", async () => {
    await service.updateHealthMeasurement(owner, firstId, { metricId: "muscle_mass", observedOn: "2026-10-31", unit: "kg", value: "62.5", notes: "Corrected" });
    expect(await service.getHealthMeasurement(owner, firstId)).toMatchObject({ metricId: "muscle_mass", observedOn: "2026-10-31", canonicalValue: "62.5000", notes: "Corrected" });
  });

  it("rejects invalid dates, values, metrics, and units", async () => {
    await expect(service.createHealthMeasurement(owner, { metricId: "weight", observedOn: "not-a-date", unit: "kg", value: "80" })).rejects.toMatchObject({ code: "invalid" });
    await expect(service.createHealthMeasurement(owner, { metricId: "weight", observedOn: "2999-01-01", unit: "kg", value: "80" })).rejects.toMatchObject({ code: "invalid" });
    await expect(service.createHealthMeasurement(owner, { metricId: "body_fat_percentage", observedOn: "2026-11-01", unit: "percent", value: "0" })).rejects.toMatchObject({ code: "invalid" });
    await expect(service.createHealthMeasurement(owner, { metricId: "weight", observedOn: "2026-11-01", unit: "cm", value: "80" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("enforces strict cross-account isolation", async () => {
    await expect(service.getHealthMeasurement(other, firstId)).rejects.toMatchObject({ status: 403 });
    await expect(service.updateHealthMeasurement(other, firstId, { metricId: "weight", observedOn: "2026-11-01", unit: "kg", value: "80" })).rejects.toMatchObject({ status: 403 });
    await expect(service.deleteHealthMeasurement(other, firstId)).rejects.toMatchObject({ status: 403 });
    expect(await service.listHealthMeasurements(other)).toEqual([]);
  });

  it("deletes only the requested owner-scoped measurement", async () => {
    await service.deleteHealthMeasurement(owner, firstId);
    expect(await service.listHealthMeasurements(owner)).toEqual([expect.objectContaining({ id: secondId })]);
    await expect(service.getHealthMeasurement(owner, firstId)).rejects.toMatchObject({ code: "not_found" });
  });
});
