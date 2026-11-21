"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import { createSymptom, deleteSymptom, SymptomError, updateSymptom } from "@/lib/health/symptom-service";

export type SymptomActionState = { message?: string; status: "error" | "idle" };

function input(formData: FormData) {
  return { checkInId: String(formData.get("checkInId") ?? "") || null, customDescription: String(formData.get("customDescription") ?? ""), endedAt: String(formData.get("endedAt") ?? ""), id: String(formData.get("requestId") ?? "") || undefined, notes: String(formData.get("notes") ?? ""), severity: Number(formData.get("severity")), startedAt: String(formData.get("startedAt") ?? ""), symptomDate: String(formData.get("symptomDate") ?? ""), symptomId: String(formData.get("symptomId") ?? "") };
}

function errorState(error: unknown): SymptomActionState { if (error instanceof SymptomError) return { message: error.message, status: "error" }; throw error; }

export async function createSymptomAction(_state: SymptomActionState, formData: FormData): Promise<SymptomActionState> {
  try { const result = await createSymptom(await requireActor(), input(formData)); revalidatePath("/journal/symptoms"); revalidatePath("/journal/check-ins"); revalidatePath("/journal"); redirect(`/journal/symptoms/${result.id}?created=1`); } catch (error) { return errorState(error); }
}

export async function updateSymptomAction(id: string, _state: SymptomActionState, formData: FormData): Promise<SymptomActionState> {
  try { await updateSymptom(await requireActor(), id, input(formData)); revalidatePath("/journal/symptoms"); revalidatePath("/journal/check-ins"); revalidatePath("/journal"); redirect(`/journal/symptoms/${id}?saved=1`); } catch (error) { return errorState(error); }
}

export async function deleteSymptomAction(id: string) { await deleteSymptom(await requireActor(), id); revalidatePath("/journal/symptoms"); revalidatePath("/journal/check-ins"); revalidatePath("/journal"); redirect("/journal/symptoms?deleted=1"); }
