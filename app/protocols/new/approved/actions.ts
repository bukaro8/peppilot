"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireActor } from "@/lib/auth/session";
import { ApprovedProtocolError, createApprovedProtocolCopy } from "@/lib/approved-protocol/copy-service";
import { getApprovedProtocolPreset } from "@/lib/approved-protocol/service";
import type { ApprovedScheduleStage } from "@/lib/approved-protocol/types";

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const numberOrNull = (value: FormDataEntryValue | null) => String(value ?? "").trim() ? Number(value) : null;

export async function createApprovedProtocolAction(formData: FormData) {
  const actor = await requireActor();
  const presetId = String(formData.get("presetId") ?? "");
  const preset = await getApprovedProtocolPreset(presetId);
  if (!preset) redirect("/templates");
  const stages = preset.definition.schedule.map((source, index) => ({
    include: formData.get(`stage.${index}.include`) === "1",
    doseAmount: String(formData.get(`stage.${index}.doseAmount`) ?? ""),
    doseUnit: String(formData.get(`stage.${index}.doseUnit`) ?? "mg") as "mg" | "mcg",
    startWeek: Number(formData.get(`stage.${index}.startWeek`)),
    endWeek: numberOrNull(formData.get(`stage.${index}.endWeek`)),
    frequencyType: String(formData.get(`stage.${index}.frequencyType`) ?? source.frequency.type) as ApprovedScheduleStage["frequency"]["type"],
    administrationsPerDay: numberOrNull(formData.get(`stage.${index}.administrationsPerDay`)),
    intervalDays: numberOrNull(formData.get(`stage.${index}.intervalDays`)),
    route: String(formData.get(`stage.${index}.route`) ?? ""),
    weekdays: weekdays.filter((day) => formData.get(`stage.${index}.weekday.${day}`) === "1"),
    ingredientDoses: source.ingredient_doses.map((ingredient, ingredientIndex) => ({
      ...ingredient,
      dose_amount: Number(formData.get(`stage.${index}.ingredient.${ingredientIndex}`)),
    })),
  }));
  try {
    const result = await createApprovedProtocolCopy(actor, {
      presetId,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      durationDays: preset.durationType === "fixed_cycle" ? Number(formData.get("durationDays")) : null,
      stages,
    });
    revalidatePath("/protocols");
    redirect(`/protocols/${result.protocolId}?created=1`);
  } catch (error) {
    if (!(error instanceof ApprovedProtocolError)) throw error;
    redirect(`/protocols/new/approved?preset=${encodeURIComponent(presetId)}&error=${encodeURIComponent(error.message)}`);
  }
}
