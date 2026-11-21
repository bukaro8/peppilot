"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import { checkInQuestions } from "@/lib/health/check-in-questions";
import { CheckInError, deleteDailyCheckIn, saveDailyCheckIn, updateQuestionPreferences } from "@/lib/health/check-in-service";

export type CheckInActionState = { message?: string; status: "error" | "idle" };

export async function saveCheckInAction(date: string, _state: CheckInActionState, formData: FormData): Promise<CheckInActionState> {
  try {
    const answers = checkInQuestions.map((question) => {
      const raw = String(formData.get(`score.${question.id}`) ?? "");
      return { questionId: question.id, score: raw ? Number(raw) : null };
    });
    await saveDailyCheckIn(await requireActor(), date, answers, String(formData.get("symptomStatus") ?? "not_answered") as "not_answered" | "no_symptoms" | "symptoms_recorded");
    revalidatePath("/journal/check-ins");
    revalidatePath("/journal/symptoms");
    revalidatePath("/journal");
    redirect(`/journal/check-ins/${date}?saved=1`);
  } catch (error) {
    if (error instanceof CheckInError) return { message: error.message, status: "error" };
    throw error;
  }
}

export async function deleteCheckInAction(date: string) {
  await deleteDailyCheckIn(await requireActor(), date);
  revalidatePath("/journal/check-ins");
  revalidatePath("/journal/symptoms");
  revalidatePath("/journal");
  redirect("/journal/check-ins?deleted=1");
}

export async function updateQuestionPreferencesAction(formData: FormData) {
  await updateQuestionPreferences(await requireActor(), formData.getAll("enabledQuestionId").map(String));
  revalidatePath("/journal/check-ins");
  revalidatePath("/journal");
  redirect("/journal/check-ins/questions?saved=1");
}
