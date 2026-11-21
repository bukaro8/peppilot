"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import {
  endProtocolCycle,
  pauseProtocolCycle,
  ProtocolCycleError,
  resumeProtocolCycle,
  reviseProtocolCycleSchedule,
  startProtocolCycle,
} from "@/lib/protocol-cycle/service";
import type {
  ProtocolTemplateFrequency,
  ProtocolTemplateScheduleInput,
} from "@/lib/protocol-template/validation";

function numberValue(value: FormDataEntryValue | null) {
  return Number(String(value ?? ""));
}

function parseSchedules(formData: FormData): ProtocolTemplateScheduleInput[] {
  const scheduleCount = numberValue(formData.get("scheduleCount"));
  return Array.from(
    { length: Number.isInteger(scheduleCount) ? scheduleCount : 0 },
    (_, index) => {
      const prefix = `schedule.${index}`;
      const intervalValue = String(formData.get(`${prefix}.intervalDays`) ?? "").trim();
      const timeValue = String(formData.get(`${prefix}.timeOfDay`) ?? "").trim();
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
      };
    },
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ProtocolCycleError) return error.message;
  throw error;
}

export async function startProtocolCycleAction(formData: FormData) {
  const actor = await requireActor();
  const protocolId = String(formData.get("protocolId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const onboarding = formData.get("onboarding") === "1";
  let result;
  try {
    result = await startProtocolCycle(actor, { protocolId, startDate });
  } catch (error) {
    redirect(`/cycles/new?protocolId=${encodeURIComponent(protocolId)}${onboarding ? "&onboarding=1" : ""}&error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath("/cycles");
  revalidatePath("/onboarding/cycles");
  if (onboarding) redirect("/onboarding/cycles?started=1");
  redirect(`/cycles/${result.cycleId}?created=1`);
}

export async function pauseProtocolCycleAction(formData: FormData) {
  const actor = await requireActor();
  const cycleId = String(formData.get("cycleId") ?? "");
  try {
    await pauseProtocolCycle(actor, cycleId, String(formData.get("date") ?? ""));
  } catch (error) {
    redirect(`/cycles/${cycleId}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath("/cycles");
  redirect(`/cycles/${cycleId}?paused=1`);
}

export async function resumeProtocolCycleAction(formData: FormData) {
  const actor = await requireActor();
  const cycleId = String(formData.get("cycleId") ?? "");
  try {
    await resumeProtocolCycle(actor, cycleId, String(formData.get("date") ?? ""));
  } catch (error) {
    redirect(`/cycles/${cycleId}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath("/cycles");
  redirect(`/cycles/${cycleId}?resumed=1`);
}

async function endCycleAction(formData: FormData, status: "completed" | "cancelled") {
  const actor = await requireActor();
  const cycleId = String(formData.get("cycleId") ?? "");
  try {
    await endProtocolCycle(actor, cycleId, status, String(formData.get("date") ?? ""));
  } catch (error) {
    redirect(`/cycles/${cycleId}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath("/cycles");
  redirect(`/cycles/${cycleId}?ended=1`);
}

export async function completeProtocolCycleAction(formData: FormData) {
  return endCycleAction(formData, "completed");
}

export async function cancelProtocolCycleAction(formData: FormData) {
  return endCycleAction(formData, "cancelled");
}

export async function reviseProtocolCycleScheduleAction(
  cycleId: string,
  formData: FormData,
) {
  const actor = await requireActor();
  try {
    await reviseProtocolCycleSchedule(
      actor,
      cycleId,
      String(formData.get("effectiveFrom") ?? ""),
      parseSchedules(formData),
    );
  } catch (error) {
    redirect(`/cycles/${cycleId}/schedule?error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath(`/cycles/${cycleId}`);
  redirect(`/cycles/${cycleId}?revised=1`);
}
