import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthenticatedActor } from "@/lib/auth/policy";

const prefix = `p05-test-${Date.now()}`;
const ownerId = `${prefix}-owner`;
const otherId = `${prefix}-other`;
const cycleId = `${prefix}-cycle`;
const revisionOneId = `${prefix}-revision-1`;
const revisionTwoId = `${prefix}-revision-2`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;
let sql: SqlClient;
let calendar: typeof import("@/lib/protocol-calendar/service");
let owner: AuthenticatedActor;
let other: AuthenticatedActor;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  calendar = await import("@/lib/protocol-calendar/service");
  owner = { userId: ownerId, role: "member" } as AuthenticatedActor;
  other = { userId: otherId, role: "member" } as AuthenticatedActor;

  await sql`insert into "user" (id, name, email, email_verified, role) values (${ownerId}, 'P05 owner', ${`${prefix}-owner@example.test`}, true, 'member'), (${otherId}, 'P05 other', ${`${prefix}-other@example.test`}, true, 'member')`;
  await sql`insert into protocol_cycle (id, owner_user_id, name, start_date, planned_end_date, status) values (${cycleId}, ${ownerId}, 'P05 private cycle', '2026-03-01', '2026-03-31', 'active')`;
  await sql`insert into protocol_cycle_schedule_revision (id, cycle_id, revision_number, effective_from, template_schedule_matches) values (${revisionOneId}, ${cycleId}, 1, '2026-03-01', false), (${revisionTwoId}, ${cycleId}, 2, '2026-03-10', false)`;
  await sql`insert into protocol_cycle_schedule_entry (id, revision_id, catalogue_entry_id, position) values (${`${prefix}-entry-1`}, ${revisionOneId}, 'catalogue-semax', 1), (${`${prefix}-entry-2`}, ${revisionTwoId}, 'catalogue-semax', 1)`;
  await sql`insert into protocol_cycle_schedule_step (id, revision_entry_id, dose_amount, dose_unit, frequency, days_of_week, interval_days, time_of_day, start_day, end_day, position) values (${`${prefix}-step-1`}, ${`${prefix}-entry-1`}, 1, 'mg', 'daily', '{}', null, '08:00', 1, 31, 1), (${`${prefix}-step-2`}, ${`${prefix}-entry-2`}, 2, 'mg', 'daily', '{}', null, '09:00', 1, 31, 1)`;
  await sql`insert into protocol_cycle_pause (id, cycle_id, paused_on, resumed_on) values (${`${prefix}-pause`}, ${cycleId}, '2026-03-05', '2026-03-07')`;
});

afterAll(async () => {
  await sql`delete from protocol_cycle where id = ${cycleId}`;
  await sql`delete from "user" where id in (${ownerId}, ${otherId})`;
  await sql.end();
});

describe("private protocol calendar query", () => {
  it("projects pause history and effective schedule revisions", async () => {
    expect(await calendar.getDailySchedule(owner, "2026-03-05")).toEqual([]);
    expect(await calendar.getDailySchedule(owner, "2026-03-07")).toEqual([
      expect.objectContaining({ cycleId, doseAmount: "1.0000", timeOfDay: "08:00" }),
    ]);
    expect(await calendar.getDailySchedule(owner, "2026-03-10")).toEqual([
      expect.objectContaining({ cycleId, doseAmount: "2.0000", timeOfDay: "09:00" }),
    ]);
  });

  it("returns no private events to another account", async () => {
    expect(await calendar.getMonthlySchedule(other, "2026-03-15")).toEqual([]);
  });
});
