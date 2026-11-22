export const approvedProtocolCategories = ["conservative", "most_used", "adventurous"] as const;
export type ApprovedProtocolCategory = (typeof approvedProtocolCategories)[number];
export type ApprovedDurationType = "fixed_cycle" | "open_ended" | "as_needed";
export type ApprovedDoseBasis =
  | "single_compound_mass"
  | "combined_blend_mass"
  | "combined_daily_mass";

export type ApprovedIngredientDose = {
  name: string;
  dose_amount: number;
  dose_unit: string;
};

export type ApprovedFrequency = {
  type: "daily" | "days_per_week" | "times_per_week" | "interval" | "as_needed";
  administrations_per_day: number | null;
  administrations_per_week: number | null;
  days_per_week: number | null;
  weekdays: string[];
  interval_days: number | null;
  time_of_day: string[];
};

export type ApprovedScheduleStage = {
  start_week: number;
  end_week: number | null;
  dose_amount: number;
  dose_unit: "mg" | "mcg";
  dose_basis: ApprovedDoseBasis;
  ingredient_doses: ApprovedIngredientDose[];
  route: string;
  frequency: ApprovedFrequency;
  source_ids: string[];
  notes: string;
};

export type ApprovedProtocolDefinition = {
  label: string;
  duration_type: ApprovedDurationType;
  duration_days?: number | null;
  duration_weeks: number | null;
  duration_basis: string;
  duration_approximate: boolean;
  schedule: ApprovedScheduleStage[];
  preparation_ids: string[];
  source_ids: string[];
  category_reason: string;
  notes: string;
  provenance: string;
  approval_status: string;
  approved_on: string;
  source_attribution_note: string;
};

export type ApprovedPreparation = {
  id: string;
  route: string;
  vial_total_mass_mg: number | null;
  vial_ingredients: Array<{ name: string; mass_mg: number }>;
  diluent: string | null;
  reported_diluent_volume_ml: number | null;
  calculated_concentration_mg_per_ml: number | null;
  concentration_basis: string | null;
  source_ids: string[];
  notes: string;
};

export type ApprovedSource = {
  id: string;
  title: string;
  url: string;
  source_type: string;
  access_status: string;
  checked_on: string;
  relevant_findings: string;
};

export type ApprovedCompoundContext = {
  slug: string;
  name: string;
  category: string;
  kind: string;
  category_explanation: string;
  unsupported_categories: string[];
  reported_variations: unknown[];
  preparation: ApprovedPreparation[];
  clinical_or_manufacturer_context: string;
  sources: ApprovedSource[];
  notes: string;
};

export type ApprovedProtocolPreset = {
  id: string;
  catalogueEntryId: string;
  catalogueSlug: string;
  displayName: string;
  category: ApprovedProtocolCategory;
  schemaVersion: string;
  durationType: ApprovedDurationType;
  definition: ApprovedProtocolDefinition;
  compoundContext: ApprovedCompoundContext;
};
