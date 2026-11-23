"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireActor } from "@/lib/auth/session";
import {
  ApprovedProtocolError,
  createApprovedProtocolCopy,
} from "@/lib/approved-protocol/copy-service";
import { getApprovedProtocolPreset } from "@/lib/approved-protocol/service";
import type { ApprovedScheduleStage } from "@/lib/approved-protocol/types";

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const numberOrNull = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim() ? Number(value) : null;

export async function createApprovedProtocolAction(formData: FormData) {
  const actor = await requireActor();
  const presetId = String(formData.get("presetId") ?? "");
  const onboarding = formData.get("onboarding") === "1";
  const preset = await getApprovedProtocolPreset(presetId);
  if (!preset) redirect("/templates");
  const stageCount = Number(formData.get("stageCount"));
  const stages = Array.from(
    { length: Number.isInteger(stageCount) ? stageCount : 0 },
    (_, index) => {
      const sourceIndex = Number(formData.get(`stage.${index}.sourceIndex`));
      const source = preset.definition.schedule[sourceIndex];
      const startDay = Number(formData.get(`stage.${index}.startDay`));
      const endDay = numberOrNull(formData.get(`stage.${index}.endDay`));
      return {
        include: formData.get(`stage.${index}.include`) === "1",
        sourceIndex,
        doseAmount: String(formData.get(`stage.${index}.doseAmount`) ?? ""),
        doseUnit: String(formData.get(`stage.${index}.doseUnit`) ?? "mg") as
          "mg" | "mcg",
        startWeek: (startDay - 1) / 7 + 1,
        endWeek: endDay === null ? null : endDay / 7,
        frequencyType: String(
          formData.get(`stage.${index}.frequencyType`) ??
            source?.frequency.type ??
            "daily",
        ) as ApprovedScheduleStage["frequency"]["type"],
        administrationsPerDay: numberOrNull(
          formData.get(`stage.${index}.administrationsPerDay`),
        ),
        intervalDays: numberOrNull(formData.get(`stage.${index}.intervalDays`)),
        route: String(formData.get(`stage.${index}.route`) ?? ""),
        weekdays: weekdays.filter(
          (day) => formData.get(`stage.${index}.weekday.${day}`) === "1",
        ),
        ingredientDoses: (source?.ingredient_doses ?? []).map(
          (ingredient, ingredientIndex) => ({
            name: ingredient.name,
            doseAmount: String(
              formData.get(`stage.${index}.ingredient.${ingredientIndex}`) ??
                "",
            ),
            doseUnit: ingredient.dose_unit,
          }),
        ),
      };
    },
  );
  try {
    const result = await createApprovedProtocolCopy(actor, {
      presetId,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      durationDays:
        preset.durationType === "fixed_cycle"
          ? Number(formData.get("durationDays"))
          : null,
      stages,
    });
    revalidatePath("/protocols");
    if (onboarding) redirect("/onboarding/protocols?created=1");
    redirect(`/protocols/${result.protocolId}?created=1`);
  } catch (error) {
    if (!(error instanceof ApprovedProtocolError)) throw error;
    redirect(
      `/protocols/new/approved?preset=${encodeURIComponent(presetId)}${onboarding ? "&onboarding=1" : ""}&error=${encodeURIComponent(error.message)}`,
    );
  }
}
