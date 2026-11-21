import "server-only";

import type { TransactionSql } from "postgres";

import { assertPrivateResourceAccess, type AuthenticatedActor, type PrivateResourceOperation } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { isSymptomId, type SymptomId } from "@/lib/health/symptoms";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";

export type SymptomInput = {
  checkInId?: string | null;
  customDescription?: string | null;
  endedAt?: string | null;
  id?: string;
  notes?: string | null;
  severity: number;
  startedAt?: string | null;
  symptomDate: string;
  symptomId: string;
};

export type SymptomRow = {
  checkInId: string | null;
  createdAt: Date;
  customDescription: string | null;
  endedAt: string | null;
  id: string;
  notes: string | null;
  ownerUserId: string;
  severity: number;
  startedAt: string | null;
  symptomDate: string;
  symptomId: SymptomId;
  updatedAt: Date;
};

export class SymptomError extends Error {
  constructor(message: string, readonly code: "conflict" | "invalid" | "not_found") { super(message); this.name = "SymptomError"; }
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalize(input: SymptomInput) {
  try { parseCalendarDate(input.symptomDate); } catch { throw new SymptomError("Symptom date must be valid.", "invalid"); }
  if (input.symptomDate < "1900-01-01" || input.symptomDate > new Date().toISOString().slice(0, 10)) throw new SymptomError("Symptom date cannot be in the future.", "invalid");
  if (!isSymptomId(input.symptomId)) throw new SymptomError("Choose a valid symptom.", "invalid");
  if (!Number.isInteger(input.severity) || input.severity < 1 || input.severity > 10) throw new SymptomError("Severity must be a whole number from 1 to 10.", "invalid");
  const customDescription = input.customDescription?.trim() || null;
  if (input.symptomId === "custom" && (!customDescription || customDescription.length > 120)) throw new SymptomError("Custom symptom description must be 1 to 120 characters.", "invalid");
  if (customDescription && customDescription.length > 120) throw new SymptomError("Custom description must be 120 characters or fewer.", "invalid");
  const startedAt = input.startedAt?.trim() || null;
  const endedAt = input.endedAt?.trim() || null;
  if ((startedAt && !timePattern.test(startedAt)) || (endedAt && !timePattern.test(endedAt))) throw new SymptomError("Symptom times must be valid.", "invalid");
  if (startedAt && endedAt && endedAt < startedAt) throw new SymptomError("End time must not be before start time.", "invalid");
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 1000) throw new SymptomError("Notes must be 1,000 characters or fewer.", "invalid");
  return { checkInId: input.checkInId || null, customDescription, endedAt, notes, severity: input.severity, startedAt, symptomDate: input.symptomDate, symptomId: input.symptomId };
}

async function assertOwnership(sql: TransactionSql | ReturnType<typeof getPostgresClient>, actor: AuthenticatedActor, id: string, operation: PrivateResourceOperation) {
  const [row] = await sql<{ ownerUserId: string }[]>`select owner_user_id as "ownerUserId" from symptom_record where id = ${id}`;
  if (!row) throw new SymptomError("Symptom record not found.", "not_found");
  assertPrivateResourceAccess(actor, row.ownerUserId, operation);
}

async function validateCheckIn(sql: TransactionSql | ReturnType<typeof getPostgresClient>, actor: AuthenticatedActor, checkInId: string | null, date: string) {
  if (!checkInId) return;
  const [row] = await sql<{ checkInDate: string; ownerUserId: string }[]>`select owner_user_id as "ownerUserId", check_in_date::text as "checkInDate" from daily_check_in where id = ${checkInId}`;
  if (!row || row.ownerUserId !== actor.userId || row.checkInDate !== date) throw new SymptomError("Linked check-in is invalid.", "invalid");
}

export async function createSymptom(actor: AuthenticatedActor, input: SymptomInput) {
  const value = normalize(input);
  const id = input.id ?? crypto.randomUUID();
  if (!idPattern.test(id)) throw new SymptomError("Symptom request is invalid.", "invalid");
  const sql = getPostgresClient();
  await validateCheckIn(sql, actor, value.checkInId, value.symptomDate);
  const [existing] = await sql<{ ownerUserId: string }[]>`select owner_user_id as "ownerUserId" from symptom_record where id = ${id}`;
  if (existing) {
    if (existing.ownerUserId === actor.userId) return { id };
    throw new SymptomError("Symptom request conflicts with an existing record.", "conflict");
  }
  await sql.begin(async (tx) => {
    await tx`insert into symptom_record (id, owner_user_id, check_in_id, symptom_date, symptom_id, custom_description, severity, started_at, ended_at, notes) values (${id}, ${actor.userId}, ${value.checkInId}, ${value.symptomDate}, ${value.symptomId}, ${value.customDescription}, ${value.severity}, ${value.startedAt}, ${value.endedAt}, ${value.notes})`;
    if (value.checkInId) await tx`update daily_check_in set symptom_status = 'symptoms_recorded', updated_at = now() where id = ${value.checkInId} and owner_user_id = ${actor.userId}`;
  });
  return { id };
}

export async function getSymptom(actor: AuthenticatedActor, id: string) {
  const sql = getPostgresClient();
  await assertOwnership(sql, actor, id, "read");
  const [row] = await sql<SymptomRow[]>`select id, owner_user_id as "ownerUserId", check_in_id as "checkInId", symptom_date::text as "symptomDate", symptom_id as "symptomId", custom_description as "customDescription", severity, to_char(started_at, 'HH24:MI') as "startedAt", to_char(ended_at, 'HH24:MI') as "endedAt", notes, created_at as "createdAt", updated_at as "updatedAt" from symptom_record where id = ${id}`;
  return row ?? null;
}

export async function listSymptoms(actor: AuthenticatedActor, date?: string) {
  if (date) { try { parseCalendarDate(date); } catch { throw new SymptomError("Symptom date must be valid.", "invalid"); } }
  const sql = getPostgresClient();
  return date
    ? sql<SymptomRow[]>`select id, owner_user_id as "ownerUserId", check_in_id as "checkInId", symptom_date::text as "symptomDate", symptom_id as "symptomId", custom_description as "customDescription", severity, to_char(started_at, 'HH24:MI') as "startedAt", to_char(ended_at, 'HH24:MI') as "endedAt", notes, created_at as "createdAt", updated_at as "updatedAt" from symptom_record where owner_user_id = ${actor.userId} and symptom_date = ${date} order by created_at desc`
    : sql<SymptomRow[]>`select id, owner_user_id as "ownerUserId", check_in_id as "checkInId", symptom_date::text as "symptomDate", symptom_id as "symptomId", custom_description as "customDescription", severity, to_char(started_at, 'HH24:MI') as "startedAt", to_char(ended_at, 'HH24:MI') as "endedAt", notes, created_at as "createdAt", updated_at as "updatedAt" from symptom_record where owner_user_id = ${actor.userId} order by symptom_date desc, created_at desc`;
}

export async function updateSymptom(actor: AuthenticatedActor, id: string, input: SymptomInput) {
  const value = normalize(input);
  const sql = getPostgresClient();
  await assertOwnership(sql, actor, id, "update");
  await validateCheckIn(sql, actor, value.checkInId, value.symptomDate);
  await sql`update symptom_record set check_in_id = ${value.checkInId}, symptom_date = ${value.symptomDate}, symptom_id = ${value.symptomId}, custom_description = ${value.customDescription}, severity = ${value.severity}, started_at = ${value.startedAt}, ended_at = ${value.endedAt}, notes = ${value.notes}, updated_at = now() where id = ${id} and owner_user_id = ${actor.userId}`;
  if (value.checkInId) await sql`update daily_check_in set symptom_status = 'symptoms_recorded', updated_at = now() where id = ${value.checkInId} and owner_user_id = ${actor.userId}`;
}

export async function deleteSymptom(actor: AuthenticatedActor, id: string) {
  const sql = getPostgresClient();
  await sql.begin(async (tx) => {
    await assertOwnership(tx, actor, id, "delete");
    const [record] = await tx<{ checkInId: string | null }[]>`delete from symptom_record where id = ${id} and owner_user_id = ${actor.userId} returning check_in_id as "checkInId"`;
    if (record?.checkInId) {
      const [remaining] = await tx<{ count: number }[]>`select count(*)::int as count from symptom_record where check_in_id = ${record.checkInId}`;
      if (remaining.count === 0) await tx`update daily_check_in set symptom_status = 'not_answered', updated_at = now() where id = ${record.checkInId} and owner_user_id = ${actor.userId}`;
    }
  });
}
