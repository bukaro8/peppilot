import "server-only";

import type { TransactionSql } from "postgres";

import { assertAdministrator, type AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import {
  validateProtocolTemplateContent,
  validateProtocolTemplateInput,
  type CreateProtocolTemplateInput,
  type ProtocolTemplateInput,
} from "@/lib/protocol-template/validation";

export type ProtocolTemplateStatus = "draft" | "published" | "retired";

export class ProtocolTemplateError extends Error {
  constructor(
    message: string,
    readonly code: "conflict" | "invalid" | "not_found",
  ) {
    super(message);
    this.name = "ProtocolTemplateError";
  }
}

type TemplateVersionRow = {
  createdAt: Date;
  description: string | null;
  durationDays: number;
  id: string;
  name: string;
  publishedAt: Date | null;
  retiredAt: Date | null;
  slug: string;
  status: ProtocolTemplateStatus;
  templateId: string;
  versionNumber: number;
};

type VersionEntryRow = {
  catalogueEntryId: string;
  catalogueSlug: string;
  displayName: string;
  id: string;
  position: number;
};

type ScheduleStepRow = {
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseUnit: string;
  endDay: number;
  frequency: "daily" | "weekly" | "interval_days";
  id: string;
  intervalDays: number | null;
  position: number;
  startDay: number;
  timeOfDay: string | null;
  versionEntryId: string;
};

async function loadVersionDetail(versionId: string) {
  const sql = getPostgresClient();
  const [version] = await sql<TemplateVersionRow[]>`
    select
      version.id,
      version.template_id as "templateId",
      template.slug,
      version.version_number as "versionNumber",
      version.name,
      version.description,
      version.duration_days as "durationDays",
      version.status,
      version.published_at as "publishedAt",
      version.retired_at as "retiredAt",
      version.created_at as "createdAt"
    from protocol_template_version version
    join protocol_template template on template.id = version.template_id
    where version.id = ${versionId}
    limit 1
  `;

  if (!version) return null;

  const entries = await sql<VersionEntryRow[]>`
    select
      entry.id,
      entry.catalogue_entry_id as "catalogueEntryId",
      catalogue.slug as "catalogueSlug",
      catalogue.display_name as "displayName",
      entry.position
    from protocol_template_version_entry entry
    join catalogue_entry catalogue on catalogue.id = entry.catalogue_entry_id
    where entry.version_id = ${versionId}
    order by entry.position
  `;
  const steps = await sql<ScheduleStepRow[]>`
    select
      step.id,
      step.version_entry_id as "versionEntryId",
      entry.catalogue_entry_id as "catalogueEntryId",
      step.dose_amount::text as "doseAmount",
      step.dose_unit as "doseUnit",
      step.frequency,
      step.days_of_week as "daysOfWeek",
      step.interval_days as "intervalDays",
      to_char(step.time_of_day, 'HH24:MI') as "timeOfDay",
      step.start_day as "startDay",
      step.end_day as "endDay",
      step.position
    from protocol_template_schedule_step step
    join protocol_template_version_entry entry on entry.id = step.version_entry_id
    where entry.version_id = ${versionId}
    order by step.position
  `;

  return { ...version, entries, steps };
}

async function insertVersionContent(
  sql: TransactionSql,
  versionId: string,
  input: ProtocolTemplateInput,
) {
  const catalogueIds = [...new Set(input.schedules.map((schedule) => schedule.catalogueEntryId))];
  const entryIds = new Map<string, string>();

  for (const [index, catalogueEntryId] of catalogueIds.entries()) {
    const catalogueRows = await sql<{ id: string }[]>`
      select id from catalogue_entry where id = ${catalogueEntryId} and is_active = true and owner_user_id is null limit 1
    `;
    if (!catalogueRows[0]) {
      throw new ProtocolTemplateError("Every schedule must use an active catalogue entry.", "invalid");
    }

    const versionEntryId = crypto.randomUUID();
    entryIds.set(catalogueEntryId, versionEntryId);
    await sql`
      insert into protocol_template_version_entry (id, version_id, catalogue_entry_id, position)
      values (${versionEntryId}, ${versionId}, ${catalogueEntryId}, ${index + 1})
    `;
  }

  for (const [index, schedule] of input.schedules.entries()) {
    const versionEntryId = entryIds.get(schedule.catalogueEntryId);
    if (!versionEntryId) {
      throw new ProtocolTemplateError("Schedule catalogue entry was not linked.", "invalid");
    }
    await sql`
      insert into protocol_template_schedule_step (
        id, version_entry_id, dose_amount, dose_unit, frequency, days_of_week,
        interval_days, time_of_day, start_day, end_day, position
      ) values (
        ${crypto.randomUUID()}, ${versionEntryId}, ${schedule.doseAmount},
        ${schedule.doseUnit}, ${schedule.frequency}, ${schedule.daysOfWeek}, ${schedule.intervalDays},
        ${schedule.timeOfDay}, ${schedule.startDay}, ${schedule.endDay}, ${index + 1}
      )
    `;
  }
}

export async function createProtocolTemplate(
  actor: AuthenticatedActor,
  input: CreateProtocolTemplateInput,
) {
  assertAdministrator(actor);
  const validation = validateProtocolTemplateInput(input);
  if (!validation.success) throw new ProtocolTemplateError(validation.error, "invalid");

  const templateId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const sql = getPostgresClient();

  try {
    await sql.begin(async (transaction) => {
      await transaction`
        insert into protocol_template (id, slug, created_by_user_id)
        values (${templateId}, ${validation.value.slug}, ${actor.userId})
      `;
      await transaction`
        insert into protocol_template_version (
          id, template_id, version_number, name, description, duration_days, status, created_by_user_id
        ) values (
          ${versionId}, ${templateId}, 1, ${validation.value.name}, ${validation.value.description},
          ${validation.value.durationDays}, 'draft', ${actor.userId}
        )
      `;
      await insertVersionContent(transaction, versionId, validation.value);
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new ProtocolTemplateError("That template slug is already in use.", "conflict");
    }
    throw error;
  }

  return { templateId, versionId, versionNumber: 1 };
}

export async function updateProtocolTemplateVersion(
  actor: AuthenticatedActor,
  versionId: string,
  input: ProtocolTemplateInput,
) {
  assertAdministrator(actor);
  const validation = validateProtocolTemplateContent(input);
  if (!validation.success) throw new ProtocolTemplateError(validation.error, "invalid");

  const sql = getPostgresClient();
  return sql.begin(async (transaction) => {
    const [current] = await transaction<{
      status: ProtocolTemplateStatus;
      templateId: string;
      versionNumber: number;
    }[]>`
      select template_id as "templateId", version_number as "versionNumber", status
      from protocol_template_version
      where id = ${versionId}
      for update
    `;
    if (!current) throw new ProtocolTemplateError("Template version not found.", "not_found");

    // Serialise version allocation for a template so concurrent edits cannot
    // attempt to create the same next version number.
    await transaction`
      select id from protocol_template where id = ${current.templateId} for update
    `;

    let targetVersionId = versionId;
    let targetVersionNumber = current.versionNumber;
    let createdNewVersion = false;

    if (current.status === "draft") {
      await transaction`
        update protocol_template_version
        set name = ${validation.value.name}, description = ${validation.value.description},
            duration_days = ${validation.value.durationDays}, updated_at = now()
        where id = ${versionId}
      `;
      await transaction`delete from protocol_template_version_entry where version_id = ${versionId}`;
    } else {
      const [next] = await transaction<{ versionNumber: number }[]>`
        select coalesce(max(version_number), 0)::int + 1 as "versionNumber"
        from protocol_template_version
        where template_id = ${current.templateId}
      `;
      targetVersionId = crypto.randomUUID();
      targetVersionNumber = next?.versionNumber ?? current.versionNumber + 1;
      createdNewVersion = true;
      await transaction`
        insert into protocol_template_version (
          id, template_id, version_number, name, description, duration_days, status, created_by_user_id
        ) values (
          ${targetVersionId}, ${current.templateId}, ${targetVersionNumber}, ${validation.value.name},
          ${validation.value.description}, ${validation.value.durationDays}, 'draft', ${actor.userId}
        )
      `;
    }

    await insertVersionContent(transaction, targetVersionId, validation.value);
    await transaction`update protocol_template set updated_at = now() where id = ${current.templateId}`;
    return { createdNewVersion, versionId: targetVersionId, versionNumber: targetVersionNumber };
  });
}

export async function publishProtocolTemplateVersion(actor: AuthenticatedActor, versionId: string) {
  assertAdministrator(actor);
  const sql = getPostgresClient();
  const rows = await sql<{ id: string }[]>`
    update protocol_template_version version
    set status = 'published', published_at = now(), updated_at = now()
    where version.id = ${versionId}
      and version.status = 'draft'
      and exists (
        select 1 from protocol_template_version_entry entry
        join protocol_template_schedule_step step on step.version_entry_id = entry.id
        where entry.version_id = version.id
      )
    returning version.id
  `;
  if (!rows[0]) {
    throw new ProtocolTemplateError("Only a populated draft can be published.", "conflict");
  }
}

export async function retireProtocolTemplateVersion(actor: AuthenticatedActor, versionId: string) {
  assertAdministrator(actor);
  const sql = getPostgresClient();
  const rows = await sql<{ id: string }[]>`
    update protocol_template_version
    set status = 'retired', retired_at = now(), updated_at = now()
    where id = ${versionId} and status = 'published'
    returning id
  `;
  if (!rows[0]) {
    throw new ProtocolTemplateError("Only a published version can be retired.", "conflict");
  }
}

export async function getPublishedProtocolTemplates() {
  const sql = getPostgresClient();
  return sql<TemplateVersionRow[]>`
    select distinct on (template.id)
      version.id,
      version.template_id as "templateId",
      template.slug,
      version.version_number as "versionNumber",
      version.name,
      version.description,
      version.duration_days as "durationDays",
      version.status,
      version.published_at as "publishedAt",
      version.retired_at as "retiredAt",
      version.created_at as "createdAt"
    from protocol_template template
    join protocol_template_version version on version.template_id = template.id
    where version.status = 'published'
    order by template.id, version.version_number desc
  `;
}

export async function getPublishedProtocolTemplateBySlug(slug: string) {
  const sql = getPostgresClient();
  const [version] = await sql<{ id: string }[]>`
    select version.id
    from protocol_template template
    join protocol_template_version version on version.template_id = template.id
    where template.slug = ${slug.trim().toLowerCase()} and version.status = 'published'
    order by version.version_number desc
    limit 1
  `;
  return version ? loadVersionDetail(version.id) : null;
}

export async function getPublishedProtocolTemplateVersionById(versionId: string) {
  const sql = getPostgresClient();
  const [version] = await sql<{ id: string }[]>`
    select id from protocol_template_version
    where id = ${versionId} and status = 'published'
    limit 1
  `;
  return version ? loadVersionDetail(version.id) : null;
}

export async function getProtocolTemplatesForAdmin(actor: AuthenticatedActor) {
  assertAdministrator(actor);
  const sql = getPostgresClient();
  return sql<TemplateVersionRow[]>`
    select distinct on (template.id)
      version.id,
      version.template_id as "templateId",
      template.slug,
      version.version_number as "versionNumber",
      version.name,
      version.description,
      version.duration_days as "durationDays",
      version.status,
      version.published_at as "publishedAt",
      version.retired_at as "retiredAt",
      version.created_at as "createdAt"
    from protocol_template template
    join protocol_template_version version on version.template_id = template.id
    order by template.id, version.version_number desc
  `;
}

export async function getProtocolTemplateForAdmin(
  actor: AuthenticatedActor,
  templateId: string,
  versionId?: string,
) {
  assertAdministrator(actor);
  const sql = getPostgresClient();
  const [version] = versionId
    ? await sql<{ id: string }[]>`
        select id from protocol_template_version
        where id = ${versionId} and template_id = ${templateId}
        limit 1
      `
    : await sql<{ id: string }[]>`
        select id from protocol_template_version
        where template_id = ${templateId}
        order by version_number desc
        limit 1
      `;
  return version ? loadVersionDetail(version.id) : null;
}

export async function getProtocolTemplateVersionsForAdmin(
  actor: AuthenticatedActor,
  templateId: string,
) {
  assertAdministrator(actor);
  const sql = getPostgresClient();
  return sql<TemplateVersionRow[]>`
    select
      version.id,
      version.template_id as "templateId",
      template.slug,
      version.version_number as "versionNumber",
      version.name,
      version.description,
      version.duration_days as "durationDays",
      version.status,
      version.published_at as "publishedAt",
      version.retired_at as "retiredAt",
      version.created_at as "createdAt"
    from protocol_template_version version
    join protocol_template template on template.id = version.template_id
    where version.template_id = ${templateId}
    order by version.version_number desc
  `;
}
