"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor } from "@/lib/auth/session";
import { createHealthMeasurement, deleteHealthMeasurement, HealthMeasurementError, updateHealthMeasurement } from "@/lib/health/measurement-service";

export type MeasurementActionState = { message?: string; status: "error" | "idle" };

function input(formData: FormData) {
  return {
    id: String(formData.get("requestId") ?? ""),
    metricId: String(formData.get("metricId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    observedOn: String(formData.get("observedOn") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    value: String(formData.get("value") ?? ""),
  };
}

function errorState(error: unknown): MeasurementActionState {
  if (error instanceof HealthMeasurementError) return { message: error.message, status: "error" };
  throw error;
}

export async function createMeasurementAction(_state: MeasurementActionState, formData: FormData): Promise<MeasurementActionState> {
  try {
    const result = await createHealthMeasurement(await requireActor(), input(formData));
    revalidatePath("/journal/measurements");
    revalidatePath("/journal");
    redirect(`/journal/measurements/${result.id}?created=1`);
  } catch (error) { return errorState(error); }
}

export async function updateMeasurementAction(id: string, _state: MeasurementActionState, formData: FormData): Promise<MeasurementActionState> {
  try {
    await updateHealthMeasurement(await requireActor(), id, input(formData));
    revalidatePath("/journal/measurements");
    revalidatePath("/journal");
    redirect(`/journal/measurements/${id}?saved=1`);
  } catch (error) { return errorState(error); }
}

export async function deleteMeasurementAction(id: string) {
  await deleteHealthMeasurement(await requireActor(), id);
  revalidatePath("/journal/measurements");
  revalidatePath("/journal");
  redirect("/journal/measurements?deleted=1");
}
