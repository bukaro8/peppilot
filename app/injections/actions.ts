"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import {
  createInjectionRecord,
  createAsNeededInjectionRecord,
  InjectionRecordError,
  type InjectionRecordInput,
  type InjectionStatus,
  updateInjectionRecord,
} from "@/lib/injection/service";

export type InjectionActionState = { message?: string; status: "error" | "idle" };

function inputFromForm(formData: FormData): InjectionRecordInput {
  return {
    actualDate: String(formData.get("actualDate") ?? ""),
    actualDoseAmount: String(formData.get("actualDoseAmount") ?? ""),
    actualDoseUnit: String(formData.get("actualDoseUnit") ?? ""),
    actualTime: String(formData.get("actualTime") ?? ""),
    actualVolumeMl: String(formData.get("actualVolumeMl") ?? ""),
    injectionSiteId: String(formData.get("injectionSiteId") ?? "") as InjectionRecordInput["injectionSiteId"],
    notes: String(formData.get("notes") ?? ""),
    status: String(formData.get("status") ?? "") as InjectionStatus,
  };
}

export async function createAsNeededInjectionRecordAction(
  cycleId: string,
  _previous: InjectionActionState,
  formData: FormData,
): Promise<InjectionActionState> {
  const actor = await requireActor();
  try {
    const result = await createAsNeededInjectionRecord(actor, cycleId, inputFromForm(formData));
    revalidatePath(`/cycles/${cycleId}`);
    revalidatePath("/injections");
    redirect(`/injections/${result.recordId}?created=1`);
  } catch (error) {
    return actionError(error);
  }
}

function actionError(error: unknown): InjectionActionState {
  if (error instanceof InjectionRecordError) return { message: error.message, status: "error" };
  throw error;
}

export async function createInjectionRecordAction(
  occurrenceId: string,
  _previous: InjectionActionState,
  formData: FormData,
): Promise<InjectionActionState> {
  const actor = await requireActor();
  try {
    const result = await createInjectionRecord(actor, occurrenceId, inputFromForm(formData));
    revalidatePath("/dashboard");
    revalidatePath("/cycles");
    revalidatePath("/calendar/week");
    revalidatePath("/calendar/month");
    revalidatePath("/injections");
    redirect(`/injections/${result.recordId}?created=1`);
  } catch (error) {
    return actionError(error);
  }
}

export async function updateInjectionRecordAction(
  recordId: string,
  _previous: InjectionActionState,
  formData: FormData,
): Promise<InjectionActionState> {
  const actor = await requireActor();
  try {
    await updateInjectionRecord(actor, recordId, inputFromForm(formData));
    revalidatePath("/dashboard");
    revalidatePath("/cycles");
    revalidatePath("/calendar/week");
    revalidatePath("/calendar/month");
    revalidatePath("/injections");
    redirect(`/injections/${recordId}?saved=1`);
  } catch (error) {
    return actionError(error);
  }
}
