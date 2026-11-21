import type { CatalogueCategory } from "@/lib/catalogue/constants";

export const checkInQuestions = [
  { id: "sleep_quality", label: "Sleep quality", prompt: "How would you rate your sleep quality?", core: true },
  { id: "energy", label: "Energy", prompt: "How would you rate your energy today?", core: true },
  { id: "recovery", label: "Recovery", prompt: "How would you rate your recovery today?", core: true },
  { id: "appetite_control", label: "Appetite control", prompt: "How manageable did your appetite feel today?", core: false },
  { id: "waist_body_composition", label: "Waist and body composition", prompt: "How would you rate waist and body-composition comfort today?", core: false },
  { id: "pain_mobility", label: "Pain and mobility", prompt: "How would you rate comfort with pain and mobility today?", core: false },
  { id: "focus", label: "Focus", prompt: "How would you rate your focus today?", core: false },
  { id: "stress", label: "Stress", prompt: "How manageable did stress feel today?", core: false },
] as const;

export type CheckInQuestionId = (typeof checkInQuestions)[number]["id"];
export type OptionalCheckInQuestionId = Exclude<CheckInQuestionId, "sleep_quality" | "energy" | "recovery">;

const questionsById = new Map(checkInQuestions.map((question) => [question.id, question]));
export const optionalCheckInQuestions = checkInQuestions.filter((question) => !question.core);

export function isCheckInQuestionId(value: string): value is CheckInQuestionId {
  return questionsById.has(value as CheckInQuestionId);
}

export function getCheckInQuestion(id: string) {
  return isCheckInQuestionId(id) ? questionsById.get(id)! : null;
}

const categoryQuestions: Record<CatalogueCategory, OptionalCheckInQuestionId[]> = {
  weight_management: ["appetite_control", "waist_body_composition"],
  healing_skin_recovery: ["pain_mobility"],
  growth_body_composition: ["waist_body_composition"],
  metabolic_wellness: [],
  cognitive: ["focus", "stress"],
};

export function selectAdaptiveQuestionIds(
  categories: CatalogueCategory[],
  preferences: Partial<Record<OptionalCheckInQuestionId, boolean>> = {},
) {
  const ids: CheckInQuestionId[] = ["sleep_quality", "energy", "recovery"];
  const selected = new Set(categories.flatMap((category) => categoryQuestions[category]));
  for (const question of optionalCheckInQuestions) {
    if (selected.has(question.id) && preferences[question.id] !== false) ids.push(question.id);
  }
  return ids;
}
