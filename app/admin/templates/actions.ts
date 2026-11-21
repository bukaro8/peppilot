"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import type { ProtocolTemplateActionState } from "@/lib/protocol-template/action-state";
import {
  createProtocolTemplate,
  ProtocolTemplateError,
  publishProtocolTemplateVersion,
  retireProtocolTemplateVersion,
  updateProtocolTemplateVersion,
} from "@/lib/protocol-template/service";
import type {
  CreateProtocolTemplateInput,
  ProtocolTemplateFrequency,
  ProtocolTemplateInput,
} from "@/lib/protocol-template/validation";

function numberValue(value: FormDataEntryValue | null) {
  return Number(String(value ?? ""));
}

function parseTemplateForm(formData: FormData, includeSlug: true): CreateProtocolTemplateInput;
function parseTemplateForm(formData: FormData, includeSlug: false): ProtocolTemplateInput;
function parseTemplateForm(formData: FormData, includeSlug: boolean) {
  const scheduleCount = numberValue(formData.get("scheduleCount"));
  const schedules = Array.from({ length: Number.isInteger(scheduleCount) ? scheduleCount : 0 }, (_, index) => {
    const prefix = `schedule.${index}`;
    const daysOfWeek = String(formData.get(`${prefix}.daysOfWeek`) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number);
    const intervalValue = String(formData.get(`${prefix}.intervalDays`) ?? "").trim();
    const timeValue = String(formData.get(`${prefix}.timeOfDay`) ?? "").trim();

    return {
      catalogueEntryId: String(formData.get(`${prefix}.catalogueEntryId`) ?? ""),
      daysOfWeek,
      doseAmount: String(formData.get(`${prefix}.doseAmount`) ?? ""),
      doseUnit: String(formData.get(`${prefix}.doseUnit`) ?? ""),
      endDay: numberValue(formData.get(`${prefix}.endDay`)),
      frequency: String(formData.get(`${prefix}.frequency`) ?? "") as ProtocolTemplateFrequency,
      intervalDays: intervalValue ? Number(intervalValue) : null,
      startDay: numberValue(formData.get(`${prefix}.startDay`)),
      timeOfDay: timeValue || null,
    };
  });
  const content = {
    description: String(formData.get("description") ?? "") || null,
    durationDays: numberValue(formData.get("durationDays")),
    name: String(formData.get("name") ?? ""),
    schedules,
  };

  return includeSlug ? { ...content, slug: String(formData.get("slug") ?? "") } : content;
}

function actionError(error: unknown): ProtocolTemplateActionState {
  if (error instanceof ProtocolTemplateError) {
    return { status: "error", message: error.message };
  }
  throw error;
}

export async function createProtocolTemplateAction(
  _previousState: ProtocolTemplateActionState,
  formData: FormData,
): Promise<ProtocolTemplateActionState> {
  const actor = await requireActor();
  try {
    const result = await createProtocolTemplate(actor, parseTemplateForm(formData, true));
    revalidatePath("/templates");
    redirect(`/admin/templates/${result.templateId}`);
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProtocolTemplateAction(
  templateId: string,
  versionId: string,
  _previousState: ProtocolTemplateActionState,
  formData: FormData,
): Promise<ProtocolTemplateActionState> {
  const actor = await requireActor();
  try {
    const result = await updateProtocolTemplateVersion(
      actor,
      versionId,
      parseTemplateForm(formData, false),
    );
    revalidatePath("/templates");
    revalidatePath(`/admin/templates/${templateId}`);
    redirect(`/admin/templates/${templateId}?version=${result.versionId}&saved=1`);
  } catch (error) {
    return actionError(error);
  }
}

export async function publishProtocolTemplateAction(formData: FormData) {
  const actor = await requireActor();
  const templateId = String(formData.get("templateId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  await publishProtocolTemplateVersion(actor, versionId);
  revalidatePath("/templates");
  revalidatePath(`/admin/templates/${templateId}`);
  redirect(`/admin/templates/${templateId}?version=${versionId}&published=1`);
}

export async function retireProtocolTemplateAction(formData: FormData) {
  const actor = await requireActor();
  const templateId = String(formData.get("templateId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  await retireProtocolTemplateVersion(actor, versionId);
  revalidatePath("/templates");
  revalidatePath(`/admin/templates/${templateId}`);
  redirect(`/admin/templates/${templateId}?version=${versionId}&retired=1`);
}
