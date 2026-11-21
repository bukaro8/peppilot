export const symptomDefinitions = [
  { id: "headache", label: "Headache" },
  { id: "nausea", label: "Nausea" },
  { id: "fatigue", label: "Fatigue" },
  { id: "dizziness", label: "Dizziness" },
  { id: "digestive_discomfort", label: "Digestive discomfort" },
  { id: "injection_site_reaction", label: "Injection-site reaction" },
  { id: "pain", label: "Pain" },
  { id: "sleep_disturbance", label: "Sleep disturbance" },
  { id: "custom", label: "Other / custom" },
] as const;

export type SymptomId = (typeof symptomDefinitions)[number]["id"];
const byId = new Map(symptomDefinitions.map((symptom) => [symptom.id, symptom]));
export function isSymptomId(value: string): value is SymptomId { return byId.has(value as SymptomId); }
export function getSymptomLabel(id: string, custom?: string | null) {
  return id === "custom" && custom ? custom : byId.get(id as SymptomId)?.label ?? id;
}
