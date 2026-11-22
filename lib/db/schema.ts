import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  primaryKey,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const appHealth = pgTable("app_health", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const catalogueEntry = pgTable(
  "catalogue_entry",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    kind: text("kind").notNull(),
    description: text("description"),
    trackingFocus: text("tracking_focus"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("catalogue_entry_category_idx").on(table.category),
    check(
      "catalogue_entry_category_check",
      sql`${table.category} in ('weight_management', 'healing_skin_recovery', 'growth_body_composition', 'metabolic_wellness', 'cognitive')`,
    ),
    check(
      "catalogue_entry_kind_check",
      sql`${table.kind} in ('peptide', 'blend', 'combination', 'tracked_compound')`,
    ),
    check("catalogue_entry_slug_check", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  ],
);

export const catalogueEntryIngredient = pgTable(
  "catalogue_entry_ingredient",
  {
    catalogueEntryId: text("catalogue_entry_id")
      .notNull()
      .references(() => catalogueEntry.id, { onDelete: "cascade" }),
    ingredientSlug: text("ingredient_slug").notNull(),
    displayName: text("display_name").notNull(),
    linkedCatalogueEntryId: text("linked_catalogue_entry_id").references(() => catalogueEntry.id, {
      onDelete: "set null",
    }),
    composition: text("composition"),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.catalogueEntryId, table.ingredientSlug] }),
    index("catalogue_entry_ingredient_entry_idx").on(table.catalogueEntryId),
    check("catalogue_entry_ingredient_position_check", sql`${table.position} > 0`),
    check(
      "catalogue_entry_ingredient_slug_check",
      sql`${table.ingredientSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const protocolTemplate = pgTable(
  "protocol_template",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("protocol_template_slug_check", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  ],
);

export const protocolTemplateVersion = pgTable(
  "protocol_template_version",
  {
    id: text("id").primaryKey(),
    templateId: text("template_id")
      .notNull()
      .references(() => protocolTemplate.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    durationDays: integer("duration_days").notNull(),
    status: text("status").default("draft").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("protocol_template_version_number_unique").on(
      table.templateId,
      table.versionNumber,
    ),
    uniqueIndex("protocol_template_version_template_id_unique").on(table.templateId, table.id),
    index("protocol_template_version_status_idx").on(table.status),
    check("protocol_template_version_number_check", sql`${table.versionNumber} > 0`),
    check("protocol_template_version_duration_check", sql`${table.durationDays} > 0`),
    check(
      "protocol_template_version_status_check",
      sql`${table.status} in ('draft', 'published', 'retired')`,
    ),
  ],
);

export const protocolTemplateVersionEntry = pgTable(
  "protocol_template_version_entry",
  {
    id: text("id").primaryKey(),
    versionId: text("version_id")
      .notNull()
      .references(() => protocolTemplateVersion.id, { onDelete: "cascade" }),
    catalogueEntryId: text("catalogue_entry_id")
      .notNull()
      .references(() => catalogueEntry.id),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("protocol_template_version_entry_catalogue_unique").on(
      table.versionId,
      table.catalogueEntryId,
    ),
    index("protocol_template_version_entry_version_idx").on(table.versionId),
    check("protocol_template_version_entry_position_check", sql`${table.position} > 0`),
  ],
);

export const protocolTemplateScheduleStep = pgTable(
  "protocol_template_schedule_step",
  {
    id: text("id").primaryKey(),
    versionEntryId: text("version_entry_id")
      .notNull()
      .references(() => protocolTemplateVersionEntry.id, { onDelete: "cascade" }),
    doseAmount: numeric("dose_amount", { precision: 12, scale: 4 }).notNull(),
    doseUnit: text("dose_unit").notNull(),
    frequency: text("frequency").notNull(),
    daysOfWeek: integer("days_of_week").array().default(sql`'{}'::integer[]`).notNull(),
    intervalDays: integer("interval_days"),
    timeOfDay: time("time_of_day"),
    startDay: integer("start_day").default(1).notNull(),
    endDay: integer("end_day").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("protocol_template_schedule_step_entry_idx").on(table.versionEntryId),
    check("protocol_template_schedule_step_dose_check", sql`${table.doseAmount} > 0`),
    check("protocol_template_schedule_step_unit_check", sql`char_length(${table.doseUnit}) between 1 and 20`),
    check(
      "protocol_template_schedule_step_frequency_check",
      sql`${table.frequency} in ('daily', 'weekly', 'interval_days')`,
    ),
    check("protocol_template_schedule_step_start_check", sql`${table.startDay} > 0`),
    check("protocol_template_schedule_step_end_check", sql`${table.endDay} >= ${table.startDay}`),
    check("protocol_template_schedule_step_position_check", sql`${table.position} > 0`),
  ],
);

export const memberProtocol = pgTable(
  "member_protocol",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationDays: integer("duration_days").notNull(),
    origin: text("origin").notNull(),
    sourceTemplateId: text("source_template_id"),
    sourceTemplateVersionId: text("source_template_version_id"),
    templateScheduleUnchanged: boolean("template_schedule_unchanged").default(false).notNull(),
    status: text("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("member_protocol_owner_idx").on(table.ownerUserId),
    index("member_protocol_source_version_idx").on(table.sourceTemplateVersionId),
    foreignKey({
      columns: [table.sourceTemplateId, table.sourceTemplateVersionId],
      foreignColumns: [protocolTemplateVersion.templateId, protocolTemplateVersion.id],
      name: "member_protocol_source_version_fk",
    }),
    check("member_protocol_duration_check", sql`${table.durationDays} > 0`),
    check("member_protocol_status_check", sql`${table.status} = 'draft'`),
    check("member_protocol_origin_check", sql`${table.origin} in ('custom', 'template')`),
    check(
      "member_protocol_provenance_check",
      sql`(
        ${table.origin} = 'custom'
        and ${table.sourceTemplateId} is null
        and ${table.sourceTemplateVersionId} is null
        and ${table.templateScheduleUnchanged} = false
      ) or (
        ${table.origin} = 'template'
        and ${table.sourceTemplateId} is not null
        and ${table.sourceTemplateVersionId} is not null
      )`,
    ),
  ],
);

export const memberProtocolEntry = pgTable(
  "member_protocol_entry",
  {
    id: text("id").primaryKey(),
    protocolId: text("protocol_id")
      .notNull()
      .references(() => memberProtocol.id, { onDelete: "cascade" }),
    catalogueEntryId: text("catalogue_entry_id")
      .notNull()
      .references(() => catalogueEntry.id),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("member_protocol_entry_catalogue_unique").on(
      table.protocolId,
      table.catalogueEntryId,
    ),
    index("member_protocol_entry_protocol_idx").on(table.protocolId),
    check("member_protocol_entry_position_check", sql`${table.position} > 0`),
  ],
);

export const memberProtocolScheduleStep = pgTable(
  "member_protocol_schedule_step",
  {
    id: text("id").primaryKey(),
    protocolEntryId: text("protocol_entry_id")
      .notNull()
      .references(() => memberProtocolEntry.id, { onDelete: "cascade" }),
    doseAmount: numeric("dose_amount", { precision: 12, scale: 4 }).notNull(),
    doseUnit: text("dose_unit").notNull(),
    frequency: text("frequency").notNull(),
    daysOfWeek: integer("days_of_week").array().default(sql`'{}'::integer[]`).notNull(),
    intervalDays: integer("interval_days"),
    timeOfDay: time("time_of_day"),
    startDay: integer("start_day").default(1).notNull(),
    endDay: integer("end_day").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("member_protocol_schedule_step_entry_idx").on(table.protocolEntryId),
    check("member_protocol_schedule_step_dose_check", sql`${table.doseAmount} > 0`),
    check(
      "member_protocol_schedule_step_unit_check",
      sql`char_length(${table.doseUnit}) between 1 and 20`,
    ),
    check(
      "member_protocol_schedule_step_frequency_check",
      sql`${table.frequency} in ('daily', 'weekly', 'interval_days')`,
    ),
    check("member_protocol_schedule_step_start_check", sql`${table.startDay} > 0`),
    check(
      "member_protocol_schedule_step_end_check",
      sql`${table.endDay} >= ${table.startDay}`,
    ),
    check("member_protocol_schedule_step_position_check", sql`${table.position} > 0`),
  ],
);

export const protocolCycle = pgTable(
  "protocol_cycle",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceProtocolId: text("source_protocol_id").references(() => memberProtocol.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    plannedEndDate: date("planned_end_date", { mode: "string" }).notNull(),
    status: text("status").default("active").notNull(),
    sourceTemplateId: text("source_template_id"),
    sourceTemplateVersionId: text("source_template_version_id"),
    templateInitiallyMatching: boolean("template_initially_matching").default(false).notNull(),
    firstDeviatedOn: date("first_deviated_on", { mode: "string" }),
    endedOn: date("ended_on", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("protocol_cycle_owner_idx").on(table.ownerUserId),
    index("protocol_cycle_status_idx").on(table.status),
    foreignKey({
      columns: [table.sourceTemplateId, table.sourceTemplateVersionId],
      foreignColumns: [protocolTemplateVersion.templateId, protocolTemplateVersion.id],
      name: "protocol_cycle_source_version_fk",
    }),
    check("protocol_cycle_dates_check", sql`${table.plannedEndDate} >= ${table.startDate}`),
    check(
      "protocol_cycle_status_check",
      sql`${table.status} in ('active', 'paused', 'completed', 'cancelled')`,
    ),
    check(
      "protocol_cycle_template_reference_check",
      sql`(
        ${table.sourceTemplateId} is null
        and ${table.sourceTemplateVersionId} is null
        and ${table.templateInitiallyMatching} = false
        and ${table.firstDeviatedOn} is null
      ) or (
        ${table.sourceTemplateId} is not null
        and ${table.sourceTemplateVersionId} is not null
      )`,
    ),
    check(
      "protocol_cycle_terminal_date_check",
      sql`(${table.status} in ('completed', 'cancelled')) = (${table.endedOn} is not null)`,
    ),
  ],
);

export const protocolCyclePause = pgTable(
  "protocol_cycle_pause",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => protocolCycle.id, { onDelete: "cascade" }),
    pausedOn: date("paused_on", { mode: "string" }).notNull(),
    resumedOn: date("resumed_on", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("protocol_cycle_pause_cycle_idx").on(table.cycleId),
    uniqueIndex("protocol_cycle_one_open_pause_unique")
      .on(table.cycleId)
      .where(sql`${table.resumedOn} is null`),
    check(
      "protocol_cycle_pause_dates_check",
      sql`${table.resumedOn} is null or ${table.resumedOn} >= ${table.pausedOn}`,
    ),
  ],
);

export const protocolCycleScheduleRevision = pgTable(
  "protocol_cycle_schedule_revision",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => protocolCycle.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    templateScheduleMatches: boolean("template_schedule_matches").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("protocol_cycle_revision_number_unique").on(
      table.cycleId,
      table.revisionNumber,
    ),
    uniqueIndex("protocol_cycle_revision_effective_unique").on(
      table.cycleId,
      table.effectiveFrom,
    ),
    check("protocol_cycle_revision_number_check", sql`${table.revisionNumber} > 0`),
  ],
);

export const protocolCycleScheduleEntry = pgTable(
  "protocol_cycle_schedule_entry",
  {
    id: text("id").primaryKey(),
    revisionId: text("revision_id")
      .notNull()
      .references(() => protocolCycleScheduleRevision.id, { onDelete: "cascade" }),
    catalogueEntryId: text("catalogue_entry_id")
      .notNull()
      .references(() => catalogueEntry.id),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("protocol_cycle_schedule_entry_catalogue_unique").on(
      table.revisionId,
      table.catalogueEntryId,
    ),
    index("protocol_cycle_schedule_entry_revision_idx").on(table.revisionId),
    check("protocol_cycle_schedule_entry_position_check", sql`${table.position} > 0`),
  ],
);

export const protocolCycleScheduleStep = pgTable(
  "protocol_cycle_schedule_step",
  {
    id: text("id").primaryKey(),
    revisionEntryId: text("revision_entry_id")
      .notNull()
      .references(() => protocolCycleScheduleEntry.id, { onDelete: "cascade" }),
    doseAmount: numeric("dose_amount", { precision: 12, scale: 4 }).notNull(),
    doseUnit: text("dose_unit").notNull(),
    frequency: text("frequency").notNull(),
    daysOfWeek: integer("days_of_week").array().default(sql`'{}'::integer[]`).notNull(),
    intervalDays: integer("interval_days"),
    timeOfDay: time("time_of_day"),
    startDay: integer("start_day").default(1).notNull(),
    endDay: integer("end_day").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("protocol_cycle_schedule_step_entry_idx").on(table.revisionEntryId),
    check("protocol_cycle_schedule_step_dose_check", sql`${table.doseAmount} > 0`),
    check(
      "protocol_cycle_schedule_step_unit_check",
      sql`char_length(${table.doseUnit}) between 1 and 20`,
    ),
    check(
      "protocol_cycle_schedule_step_frequency_check",
      sql`${table.frequency} in ('daily', 'weekly', 'interval_days')`,
    ),
    check("protocol_cycle_schedule_step_start_check", sql`${table.startDay} > 0`),
    check(
      "protocol_cycle_schedule_step_end_check",
      sql`${table.endDay} >= ${table.startDay}`,
    ),
    check("protocol_cycle_schedule_step_position_check", sql`${table.position} > 0`),
  ],
);

export const injectionRecord = pgTable(
  "injection_record",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => protocolCycle.id, { onDelete: "cascade" }),
    scheduledOccurrenceId: text("scheduled_occurrence_id").notNull(),
    scheduleRevisionId: text("schedule_revision_id")
      .notNull()
      .references(() => protocolCycleScheduleRevision.id),
    scheduleStepId: text("schedule_step_id")
      .notNull()
      .references(() => protocolCycleScheduleStep.id),
    catalogueEntryId: text("catalogue_entry_id")
      .notNull()
      .references(() => catalogueEntry.id),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    scheduledTime: time("scheduled_time"),
    scheduledDoseAmount: numeric("scheduled_dose_amount", { precision: 12, scale: 4 }).notNull(),
    scheduledDoseUnit: text("scheduled_dose_unit").notNull(),
    status: text("status").notNull(),
    actualDate: date("actual_date", { mode: "string" }),
    actualTime: time("actual_time"),
    actualDoseAmount: numeric("actual_dose_amount", { precision: 12, scale: 4 }),
    actualDoseUnit: text("actual_dose_unit"),
    actualVolumeMl: numeric("actual_volume_ml", { precision: 8, scale: 4 }),
    injectionSiteId: text("injection_site_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("injection_record_occurrence_unique").on(table.scheduledOccurrenceId),
    index("injection_record_owner_date_idx").on(table.ownerUserId, table.scheduledDate),
    index("injection_record_cycle_idx").on(table.cycleId),
    check("injection_record_status_check", sql`${table.status} in ('completed', 'skipped', 'missed')`),
    check("injection_record_scheduled_unit_check", sql`char_length(${table.scheduledDoseUnit}) between 1 and 20`),
    check("injection_record_scheduled_dose_check", sql`${table.scheduledDoseAmount} > 0`),
    check(
      "injection_record_actual_volume_check",
      sql`${table.actualVolumeMl} is null or ${table.actualVolumeMl} > 0`,
    ),
    check("injection_record_notes_check", sql`${table.notes} is null or char_length(${table.notes}) <= 1000`),
    check(
      "injection_record_site_check",
      sql`${table.injectionSiteId} is null or ${table.injectionSiteId} in (
        'abdomen_left_upper', 'abdomen_left_lower', 'abdomen_right_upper', 'abdomen_right_lower',
        'love_handle_left', 'love_handle_right',
        'thigh_left_upper', 'thigh_left_lower', 'thigh_right_upper', 'thigh_right_lower',
        'upper_arm_left', 'upper_arm_right', 'upper_buttock_left', 'upper_buttock_right'
      )`,
    ),
    check(
      "injection_record_actual_fields_check",
      sql`(
        ${table.status} = 'completed'
        and ${table.actualDate} is not null
        and ${table.actualTime} is not null
        and ${table.actualDoseAmount} > 0
        and char_length(${table.actualDoseUnit}) between 1 and 20
      ) or (
        ${table.status} in ('skipped', 'missed')
        and ${table.actualDate} is null
        and ${table.actualTime} is null
        and ${table.actualDoseAmount} is null
        and ${table.actualDoseUnit} is null
        and ${table.actualVolumeMl} is null
        and ${table.injectionSiteId} is null
      )`,
    ),
  ],
);

export const injectionRecordHistory = pgTable(
  "injection_record_history",
  {
    id: text("id").primaryKey(),
    injectionRecordId: text("injection_record_id")
      .notNull()
      .references(() => injectionRecord.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status").notNull(),
    previousActualDate: date("previous_actual_date", { mode: "string" }),
    previousActualTime: time("previous_actual_time"),
    previousActualDoseAmount: numeric("previous_actual_dose_amount", {
      precision: 12,
      scale: 4,
    }),
    previousActualDoseUnit: text("previous_actual_dose_unit"),
    previousActualVolumeMl: numeric("previous_actual_volume_ml", { precision: 8, scale: 4 }),
    previousInjectionSiteId: text("previous_injection_site_id"),
    previousNotes: text("previous_notes"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("injection_record_history_record_idx").on(table.injectionRecordId)],
);

export const memberInjectionSitePreference = pgTable(
  "member_injection_site_preference",
  {
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    injectionSiteId: text("injection_site_id").notNull(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerUserId, table.injectionSiteId] }),
    index("member_injection_site_preference_owner_idx").on(table.ownerUserId),
    check(
      "member_injection_site_preference_site_check",
      sql`${table.injectionSiteId} in (
        'abdomen_left_upper', 'abdomen_left_lower', 'abdomen_right_upper', 'abdomen_right_lower',
        'love_handle_left', 'love_handle_right',
        'thigh_left_upper', 'thigh_left_lower', 'thigh_right_upper', 'thigh_right_lower',
        'upper_arm_left', 'upper_arm_right', 'upper_buttock_left', 'upper_buttock_right'
      )`,
    ),
  ],
);

export const healthMeasurement = pgTable(
  "health_measurement",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    metricId: text("metric_id").notNull(),
    observedOn: date("observed_on", { mode: "string" }).notNull(),
    canonicalValue: numeric("canonical_value", { precision: 14, scale: 4 }).notNull(),
    canonicalUnit: text("canonical_unit").notNull(),
    enteredValue: numeric("entered_value", { precision: 14, scale: 4 }).notNull(),
    enteredUnit: text("entered_unit").notNull(),
    source: text("source").default("manual").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("health_measurement_owner_date_idx").on(table.ownerUserId, table.observedOn),
    index("health_measurement_owner_metric_date_idx").on(
      table.ownerUserId,
      table.metricId,
      table.observedOn,
    ),
    check(
      "health_measurement_metric_check",
      sql`${table.metricId} in ('weight', 'waist_circumference', 'body_fat_percentage', 'muscle_mass', 'hip_circumference', 'chest_circumference')`,
    ),
    check(
      "health_measurement_canonical_unit_check",
      sql`${table.canonicalUnit} in ('kg', 'cm', 'percent')`,
    ),
    check(
      "health_measurement_entered_unit_check",
      sql`${table.enteredUnit} in ('kg', 'lb', 'cm', 'in', 'percent')`,
    ),
    check("health_measurement_value_check", sql`${table.canonicalValue} > 0 and ${table.enteredValue} > 0`),
    check("health_measurement_source_check", sql`${table.source} = 'manual'`),
    check(
      "health_measurement_notes_check",
      sql`${table.notes} is null or char_length(${table.notes}) <= 500`,
    ),
  ],
);

export const dailyCheckIn = pgTable(
  "daily_check_in",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    checkInDate: date("check_in_date", { mode: "string" }).notNull(),
    symptomStatus: text("symptom_status").default("not_answered").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("daily_check_in_owner_date_unique").on(table.ownerUserId, table.checkInDate),
    index("daily_check_in_owner_date_idx").on(table.ownerUserId, table.checkInDate),
    check("daily_check_in_symptom_status_check", sql`${table.symptomStatus} in ('not_answered', 'no_symptoms', 'symptoms_recorded')`),
  ],
);

export const dailyCheckInAnswer = pgTable(
  "daily_check_in_answer",
  {
    checkInId: text("check_in_id").notNull().references(() => dailyCheckIn.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.checkInId, table.questionId] }),
    check("daily_check_in_answer_score_check", sql`${table.score} between 1 and 10`),
    check("daily_check_in_answer_question_check", sql`${table.questionId} in ('sleep_quality', 'energy', 'recovery', 'appetite_control', 'waist_body_composition', 'pain_mobility', 'focus', 'stress')`),
  ],
);

export const checkInQuestionPreference = pgTable(
  "check_in_question_preference",
  {
    ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerUserId, table.questionId] }),
    check("check_in_question_preference_question_check", sql`${table.questionId} in ('appetite_control', 'waist_body_composition', 'pain_mobility', 'focus', 'stress')`),
  ],
);

export const symptomRecord = pgTable(
  "symptom_record",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    checkInId: text("check_in_id").references(() => dailyCheckIn.id, { onDelete: "set null" }),
    symptomDate: date("symptom_date", { mode: "string" }).notNull(),
    symptomId: text("symptom_id").notNull(),
    customDescription: text("custom_description"),
    severity: integer("severity").notNull(),
    startedAt: time("started_at"),
    endedAt: time("ended_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("symptom_record_owner_date_idx").on(table.ownerUserId, table.symptomDate),
    index("symptom_record_check_in_idx").on(table.checkInId),
    check("symptom_record_symptom_check", sql`${table.symptomId} in ('headache', 'nausea', 'fatigue', 'dizziness', 'digestive_discomfort', 'injection_site_reaction', 'pain', 'sleep_disturbance', 'custom')`),
    check("symptom_record_severity_check", sql`${table.severity} between 1 and 10`),
    check("symptom_record_description_check", sql`(${table.symptomId} = 'custom' and char_length(${table.customDescription}) between 1 and 120) or (${table.symptomId} <> 'custom' and (${table.customDescription} is null or char_length(${table.customDescription}) <= 120))`),
    check("symptom_record_notes_check", sql`${table.notes} is null or char_length(${table.notes}) <= 1000`),
    check("symptom_record_time_check", sql`${table.startedAt} is null or ${table.endedAt} is null or ${table.endedAt} >= ${table.startedAt}`),
  ],
);

export const protocolCycleGoal = pgTable(
  "protocol_cycle_goal",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => protocolCycle.id, { onDelete: "cascade" }),
    metricId: text("metric_id").notNull(),
    targetValue: numeric("target_value", { precision: 14, scale: 4 }),
    targetUnit: text("target_unit").notNull(),
    baselineStatus: text("baseline_status").notNull(),
    baselineSourceType: text("baseline_source_type").notNull(),
    baselineSourceId: text("baseline_source_id"),
    baselineValue: numeric("baseline_value", { precision: 14, scale: 4 }),
    baselineUnit: text("baseline_unit"),
    baselineObservedOn: date("baseline_observed_on", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("protocol_cycle_goal_cycle_metric_unique").on(table.cycleId, table.metricId),
    index("protocol_cycle_goal_cycle_idx").on(table.cycleId),
    check(
      "protocol_cycle_goal_metric_check",
      sql`${table.metricId} in (
        'weight', 'waist_circumference', 'body_fat_percentage', 'muscle_mass',
        'hip_circumference', 'chest_circumference', 'sleep_quality', 'energy',
        'recovery', 'appetite_control', 'waist_body_composition', 'pain_mobility',
        'focus', 'stress'
      )`,
    ),
    check(
      "protocol_cycle_goal_unit_check",
      sql`${table.targetUnit} in ('kg', 'cm', 'percent', 'score')`,
    ),
    check(
      "protocol_cycle_goal_target_check",
      sql`${table.targetValue} is null or ${table.targetValue} > 0`,
    ),
    check(
      "protocol_cycle_goal_baseline_status_check",
      sql`${table.baselineStatus} in ('valid', 'missing', 'unsuitable')`,
    ),
    check(
      "protocol_cycle_goal_baseline_source_check",
      sql`${table.baselineSourceType} in ('measurement', 'check_in', 'none')`,
    ),
    check(
      "protocol_cycle_goal_baseline_snapshot_check",
      sql`(
        ${table.baselineStatus} = 'missing'
        and ${table.baselineSourceType} = 'none'
        and ${table.baselineSourceId} is null
        and ${table.baselineValue} is null
        and ${table.baselineUnit} is null
        and ${table.baselineObservedOn} is null
      ) or (
        ${table.baselineStatus} in ('valid', 'unsuitable')
        and ${table.baselineSourceType} in ('measurement', 'check_in')
        and ${table.baselineSourceId} is not null
        and ${table.baselineValue} is not null
        and ${table.baselineUnit} is not null
        and ${table.baselineObservedOn} is not null
      )`,
    ),
  ],
);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    username: text("username"),
    displayName: text("display_name"),
    bio: text("bio"),
    communityAnalyticsEnabled: boolean("community_analytics_enabled").default(true).notNull(),
    communityAnalyticsUpdatedAt: timestamp("community_analytics_updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_username_lower_unique")
      .on(sql`lower(${table.username})`)
      .where(sql`${table.username} is not null`),
    check(
      "user_username_format_check",
      sql`${table.username} is null or ${table.username} ~ '^[A-Za-z0-9_]{3,30}$'`,
    ),
    check(
      "user_display_name_length_check",
      sql`${table.displayName} is null or char_length(${table.displayName}) between 1 and 60`,
    ),
    check("user_bio_length_check", sql`${table.bio} is null or char_length(${table.bio}) <= 280`),
    check("user_role_check", sql`${table.role} in ('member', 'admin')`),
  ],
);

export const communityAggregateInvalidation = pgTable("community_aggregate_invalidation", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  invalidatedAt: timestamp("invalidated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
