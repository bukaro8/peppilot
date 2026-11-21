import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  appHealth,
  catalogueEntry,
  catalogueEntryIngredient,
  communityAggregateInvalidation,
  dailyCheckIn,
  dailyCheckInAnswer,
  checkInQuestionPreference,
  healthMeasurement,
  memberProtocol,
  memberProtocolEntry,
  memberProtocolScheduleStep,
  protocolTemplate,
  protocolCycle,
  protocolCycleGoal,
  protocolCyclePause,
  protocolCycleScheduleEntry,
  protocolCycleScheduleRevision,
  protocolCycleScheduleStep,
  protocolTemplateScheduleStep,
  protocolTemplateVersion,
  protocolTemplateVersionEntry,
  symptomRecord,
  user,
} from "@/lib/db/schema";

describe("database schema", () => {
  it("keeps the minimal app_health connectivity table", () => {
    const columns = getTableColumns(appHealth);

    expect(getTableName(appHealth)).toBe("app_health");
    expect(Object.keys(columns)).toEqual(["id", "createdAt"]);
    expect(columns.id.name).toBe("id");
    expect(columns.id.primary).toBe(true);
    expect(columns.createdAt.name).toBe("created_at");
    expect(columns.createdAt.notNull).toBe(true);
  });

  it("defaults community analytics participation to enabled", () => {
    const userColumns = getTableColumns(user);
    const invalidationColumns = getTableColumns(communityAggregateInvalidation);

    expect(userColumns.communityAnalyticsEnabled.notNull).toBe(true);
    expect(userColumns.communityAnalyticsEnabled.default).toBe(true);
    expect(userColumns.communityAnalyticsUpdatedAt.notNull).toBe(true);
    expect(userColumns.role.notNull).toBe(true);
    expect(userColumns.role.default).toBe("member");
    expect(invalidationColumns.userId.primary).toBe(true);
  });

  it("models catalogue entries and blend ingredient relationships", () => {
    const entryColumns = getTableColumns(catalogueEntry);
    const ingredientColumns = getTableColumns(catalogueEntryIngredient);

    expect(getTableName(catalogueEntry)).toBe("catalogue_entry");
    expect(entryColumns.id.primary).toBe(true);
    expect(entryColumns.slug.isUnique).toBe(true);
    expect(entryColumns.isActive.default).toBe(true);
    expect(entryColumns.trackingFocus.name).toBe("tracking_focus");
    expect(getTableName(catalogueEntryIngredient)).toBe("catalogue_entry_ingredient");
    expect(ingredientColumns.catalogueEntryId.notNull).toBe(true);
    expect(ingredientColumns.position.notNull).toBe(true);
  });

  it("models immutable protocol template versions and structured schedules", () => {
    expect(getTableName(protocolTemplate)).toBe("protocol_template");
    expect(getTableColumns(protocolTemplate).slug.isUnique).toBe(true);
    expect(getTableName(protocolTemplateVersion)).toBe("protocol_template_version");
    expect(getTableColumns(protocolTemplateVersion).versionNumber.notNull).toBe(true);
    expect(getTableColumns(protocolTemplateVersion).status.default).toBe("draft");
    expect(getTableName(protocolTemplateVersionEntry)).toBe("protocol_template_version_entry");
    expect(getTableName(protocolTemplateScheduleStep)).toBe("protocol_template_schedule_step");
    expect(getTableColumns(protocolTemplateScheduleStep).doseAmount.notNull).toBe(true);
    expect(getTableColumns(protocolTemplateScheduleStep).daysOfWeek.notNull).toBe(true);
  });

  it("models private member protocol provenance and schedules", () => {
    expect(getTableName(memberProtocol)).toBe("member_protocol");
    expect(getTableColumns(memberProtocol).ownerUserId.notNull).toBe(true);
    expect(getTableColumns(memberProtocol).templateScheduleUnchanged.default).toBe(false);
    expect(getTableColumns(memberProtocol).status.default).toBe("draft");
    expect(getTableName(memberProtocolEntry)).toBe("member_protocol_entry");
    expect(getTableName(memberProtocolScheduleStep)).toBe("member_protocol_schedule_step");
    expect(getTableColumns(memberProtocolScheduleStep).doseAmount.notNull).toBe(true);
  });

  it("models independent cycles, pauses and immutable schedule revisions", () => {
    expect(getTableName(protocolCycle)).toBe("protocol_cycle");
    expect(getTableColumns(protocolCycle).status.default).toBe("active");
    expect(getTableColumns(protocolCycle).firstDeviatedOn.name).toBe("first_deviated_on");
    expect(getTableName(protocolCyclePause)).toBe("protocol_cycle_pause");
    expect(getTableName(protocolCycleScheduleRevision)).toBe(
      "protocol_cycle_schedule_revision",
    );
    expect(getTableColumns(protocolCycleScheduleRevision).revisionNumber.notNull).toBe(true);
    expect(getTableName(protocolCycleScheduleEntry)).toBe("protocol_cycle_schedule_entry");
    expect(getTableName(protocolCycleScheduleStep)).toBe("protocol_cycle_schedule_step");
  });

  it("models owner-scoped canonical health measurements", () => {
    expect(getTableName(healthMeasurement)).toBe("health_measurement");
    const columns = getTableColumns(healthMeasurement);
    expect(columns.ownerUserId.notNull).toBe(true);
    expect(columns.metricId.notNull).toBe(true);
    expect(columns.observedOn.notNull).toBe(true);
    expect(columns.canonicalValue.notNull).toBe(true);
    expect(columns.canonicalUnit.notNull).toBe(true);
    expect(columns.enteredValue.notNull).toBe(true);
    expect(columns.enteredUnit.notNull).toBe(true);
    expect(columns.source.default).toBe("manual");
  });

  it("models shared daily check-ins and private symptom records", () => {
    expect(getTableName(dailyCheckIn)).toBe("daily_check_in");
    expect(getTableColumns(dailyCheckIn).ownerUserId.notNull).toBe(true);
    expect(getTableName(dailyCheckInAnswer)).toBe("daily_check_in_answer");
    expect(getTableColumns(dailyCheckInAnswer).score.notNull).toBe(true);
    expect(getTableName(checkInQuestionPreference)).toBe("check_in_question_preference");
    expect(getTableName(symptomRecord)).toBe("symptom_record");
    expect(getTableColumns(symptomRecord).severity.notNull).toBe(true);
  });

  it("stores independent cycle goals with frozen baseline snapshots", () => {
    expect(getTableName(protocolCycleGoal)).toBe("protocol_cycle_goal");
    const columns = getTableColumns(protocolCycleGoal);
    expect(columns.cycleId.notNull).toBe(true);
    expect(columns.metricId.notNull).toBe(true);
    expect(columns.baselineStatus.notNull).toBe(true);
    expect(columns.baselineSourceId.notNull).toBe(false);
    expect(columns.baselineValue.notNull).toBe(false);
  });
});
