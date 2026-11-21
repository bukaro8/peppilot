"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import { CycleGoalError, saveCycleGoals } from "@/lib/health/cycle-goal-service";

export async function saveCycleGoalsAction(cycleId: string, formData: FormData) {
  const metricIds = formData.getAll("metricId").map(String);
  try {
    await saveCycleGoals(
      await requireActor(),
      cycleId,
      metricIds.map((metricId) => ({
        metricId,
        targetValue: String(formData.get(`target.${metricId}`) ?? ""),
      })),
    );
  } catch (error) {
    if (error instanceof CycleGoalError) {
      redirect(`/cycles/${cycleId}/goals?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath(`/cycles/${cycleId}`);
  revalidatePath("/journal");
  redirect(`/cycles/${cycleId}?goals=1`);
}
