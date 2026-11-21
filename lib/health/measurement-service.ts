import "server-only";

import type { TransactionSql } from "postgres";

import { assertPrivateResourceAccess, type AuthenticatedActor, type PrivateResourceOperation } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { convertToCanonical, getHealthMetric, isHealthMetricId, type HealthMeasurementUnit } from "@/lib/health/metrics";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";

export type HealthMeasurementInput = {
  id?: string;
  metricId: string;
  notes?: string | null;
  observedOn: string;
  unit: string;
  value: string;
};

export type HealthMeasurementRow = {
  canonicalUnit: HealthMeasurementUnit;
  canonicalValue: string;
  createdAt: Date;
  enteredUnit: HealthMeasurementUnit;
  enteredValue: string;
  id: string;
  metricId: string;
  notes: string | null;
  observedOn: string;
  ownerUserId: string;
  source: "manual";
  updatedAt: Date;
};

export class HealthMeasurementError extends Error {
  constructor(message: string, readonly code: "conflict" | "invalid" | "not_found") {
    super(message);
    this.name = "HealthMeasurementError";
  }
}

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeInput(input: HealthMeasurementInput) {
  if (!isHealthMetricId(input.metricId)) throw new HealthMeasurementError("Choose a valid measurement type.", "invalid");
  try { parseCalendarDate(input.observedOn); }
  catch { throw new HealthMeasurementError("Measurement date must be valid.", "invalid"); }
  const today = new Date().toISOString().slice(0, 10);
  if (input.observedOn < "1900-01-01" || input.observedOn > today) {
    throw new HealthMeasurementError("Measurement date must be between 1900-01-01 and today.", "invalid");
  }
  const enteredValue = Number(input.value);
  let canonical;
  try { canonical = convertToCanonical(input.metricId, enteredValue, input.unit); }
  catch (error) { throw new HealthMeasurementError((error as Error).message, "invalid"); }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 500) throw new HealthMeasurementError("Notes must be 500 characters or fewer.", "invalid");
  return { ...canonical, enteredUnit: input.unit as HealthMeasurementUnit, enteredValue, metricId: input.metricId, notes, observedOn: input.observedOn };
}

async function assertOwnership(
  sql: TransactionSql | ReturnType<typeof getPostgresClient>,
  actor: AuthenticatedActor,
  id: string,
  operation: PrivateResourceOperation,
) {
  const [row] = await sql<{ ownerUserId: string }[]>`select owner_user_id as "ownerUserId" from health_measurement where id = ${id}`;
  if (!row) throw new HealthMeasurementError("Measurement not found.", "not_found");
  assertPrivateResourceAccess(actor, row.ownerUserId, operation);
}

export async function createHealthMeasurement(actor: AuthenticatedActor, input: HealthMeasurementInput) {
  const value = normalizeInput(input);
  const id = input.id ?? crypto.randomUUID();
  if (!idPattern.test(id)) throw new HealthMeasurementError("Measurement request is invalid.", "invalid");
  const sql = getPostgresClient();
  const [existing] = await sql<{ ownerUserId: string }[]>`select owner_user_id as "ownerUserId" from health_measurement where id = ${id}`;
  if (existing) {
    if (existing.ownerUserId === actor.userId) return { id };
    throw new HealthMeasurementError("Measurement request conflicts with an existing record.", "conflict");
  }
  await sql`
    insert into health_measurement (
      id, owner_user_id, metric_id, observed_on, canonical_value, canonical_unit,
      entered_value, entered_unit, source, notes
    ) values (
      ${id}, ${actor.userId}, ${value.metricId}, ${value.observedOn}, ${value.canonicalValue},
      ${value.canonicalUnit}, ${value.enteredValue}, ${value.enteredUnit}, 'manual', ${value.notes}
    )
  `;
  return { id };
}

export async function getHealthMeasurement(actor: AuthenticatedActor, id: string) {
  const sql = getPostgresClient();
  await assertOwnership(sql, actor, id, "read");
  const [row] = await sql<HealthMeasurementRow[]>`
    select id, owner_user_id as "ownerUserId", metric_id as "metricId",
      observed_on::text as "observedOn", canonical_value::text as "canonicalValue",
      canonical_unit as "canonicalUnit", entered_value::text as "enteredValue",
      entered_unit as "enteredUnit", source, notes, created_at as "createdAt", updated_at as "updatedAt"
    from health_measurement where id = ${id}
  `;
  return row ?? null;
}

export async function listHealthMeasurements(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  return sql<HealthMeasurementRow[]>`
    select id, owner_user_id as "ownerUserId", metric_id as "metricId",
      observed_on::text as "observedOn", canonical_value::text as "canonicalValue",
      canonical_unit as "canonicalUnit", entered_value::text as "enteredValue",
      entered_unit as "enteredUnit", source, notes, created_at as "createdAt", updated_at as "updatedAt"
    from health_measurement
    where owner_user_id = ${actor.userId}
    order by observed_on desc, created_at desc, id desc
  `;
}

export async function updateHealthMeasurement(actor: AuthenticatedActor, id: string, input: HealthMeasurementInput) {
  const value = normalizeInput(input);
  const sql = getPostgresClient();
  await assertOwnership(sql, actor, id, "update");
  await sql`
    update health_measurement set metric_id = ${value.metricId}, observed_on = ${value.observedOn},
      canonical_value = ${value.canonicalValue}, canonical_unit = ${value.canonicalUnit},
      entered_value = ${value.enteredValue}, entered_unit = ${value.enteredUnit},
      notes = ${value.notes}, updated_at = now()
    where id = ${id} and owner_user_id = ${actor.userId}
  `;
}

export async function deleteHealthMeasurement(actor: AuthenticatedActor, id: string) {
  const sql = getPostgresClient();
  await assertOwnership(sql, actor, id, "delete");
  await sql`delete from health_measurement where id = ${id} and owner_user_id = ${actor.userId}`;
}

export function getMeasurementLabel(metricId: string) {
  return getHealthMetric(metricId)?.label ?? metricId;
}
