"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import type { MemberProtocolActionState } from "@/lib/member-protocol/action-state";
import {
  copyPublishedTemplateToProtocol,
  createMemberProtocol,
  deleteMemberProtocol,
  MemberProtocolError,
  updateMemberProtocol,
} from "@/lib/member-protocol/service";
import type {
  ProtocolTemplateFrequency,
  ProtocolTemplateInput,
} from "@/lib/protocol-template/validation";

function numberValue(value: FormDataEntryValue | null) {
  return Number(String(value ?? ""));
}

function parseProtocolForm(formData: FormData): ProtocolTemplateInput {
  const scheduleCount = numberValue(formData.get("scheduleCount"));
  const schedules = Array.from(
    { length: Number.isInteger(scheduleCount) ? scheduleCount : 0 },
    (_, index) => {
      const prefix = `schedule.${index}`;
      const intervalValue = String(formData.get(`${prefix}.intervalDays`) ?? "").trim();
      const timeValue = String(formData.get(`${prefix}.timeOfDay`) ?? "").trim();
      const parseJsonArray = (name: string) => {
        try {
          const value = JSON.parse(String(formData.get(`${prefix}.${name}`) ?? "[]"));
          return Array.isArray(value) ? value : [];
        } catch { return []; }
      };
      return {
        catalogueEntryId: String(formData.get(`${prefix}.catalogueEntryId`) ?? ""),
        daysOfWeek: String(formData.get(`${prefix}.daysOfWeek`) ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map(Number),
        doseAmount: String(formData.get(`${prefix}.doseAmount`) ?? ""),
        doseUnit: String(formData.get(`${prefix}.doseUnit`) ?? ""),
        endDay: numberValue(formData.get(`${prefix}.endDay`)),
        frequency: String(
          formData.get(`${prefix}.frequency`) ?? "",
        ) as ProtocolTemplateFrequency,
        intervalDays: intervalValue ? Number(intervalValue) : null,
        startDay: numberValue(formData.get(`${prefix}.startDay`)),
        timeOfDay: timeValue || null,
        administrationsPerDay: numberValue(formData.get(`${prefix}.administrationsPerDay`)) || 1,
        doseBasis: String(formData.get(`${prefix}.doseBasis`) ?? "single_compound_mass"),
        ingredientDoses: parseJsonArray("ingredientDoses"),
        route: String(formData.get(`${prefix}.route`) ?? "") || null,
        timesOfDay: parseJsonArray("timesOfDay") as string[],
      };
    },
  );

  return {
    description: String(formData.get("description") ?? "") || null,
    durationDays: numberValue(formData.get("durationDays")),
    name: String(formData.get("name") ?? ""),
    schedules,
  };
}

function actionError(error: unknown): MemberProtocolActionState {
  if (error instanceof MemberProtocolError) {
    return { status: "error", message: error.message };
  }
  throw error;
}

export async function createMemberProtocolAction(
  sourceVersionId: string | null,
  onboarding: boolean,
  _previousState: MemberProtocolActionState,
  formData: FormData,
): Promise<MemberProtocolActionState> {
  const actor = await requireActor();
  try {
    const input = parseProtocolForm(formData);
    const result = sourceVersionId
      ? await copyPublishedTemplateToProtocol(actor, sourceVersionId, input)
      : await createMemberProtocol(actor, input);
    revalidatePath("/protocols");
    revalidatePath("/onboarding/protocols");
    if (onboarding) redirect("/onboarding/protocols?created=1");
    redirect(`/protocols/${result.protocolId}?created=1`);
  } catch (error) {
    return actionError(error);
  }
}

export async function updateMemberProtocolAction(
  protocolId: string,
  _previousState: MemberProtocolActionState,
  formData: FormData,
): Promise<MemberProtocolActionState> {
  const actor = await requireActor();
  try {
    await updateMemberProtocol(actor, protocolId, parseProtocolForm(formData));
    revalidatePath("/protocols");
    revalidatePath(`/protocols/${protocolId}`);
    redirect(`/protocols/${protocolId}?saved=1`);
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteMemberProtocolAction(formData: FormData) {
  const actor = await requireActor();
  const protocolId = String(formData.get("protocolId") ?? "");
  await deleteMemberProtocol(actor, protocolId);
  revalidatePath("/protocols");
  redirect("/protocols?deleted=1");
}
