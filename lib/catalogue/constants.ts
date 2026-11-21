export const catalogueCategories = [
  "weight_management",
  "healing_skin_recovery",
  "growth_body_composition",
  "metabolic_wellness",
  "cognitive",
] as const;

export type CatalogueCategory = (typeof catalogueCategories)[number];

export const catalogueCategoryLabels: Record<CatalogueCategory, string> = {
  weight_management: "Weight management",
  healing_skin_recovery: "Healing, skin & recovery",
  growth_body_composition: "Growth & body composition",
  metabolic_wellness: "Metabolic & wellness",
  cognitive: "Cognitive",
};

export const catalogueKindLabels = {
  peptide: "Peptide",
  blend: "Blend",
  tracked_compound: "Tracked compound",
} as const;

export function isCatalogueCategory(value: string | undefined): value is CatalogueCategory {
  return catalogueCategories.includes(value as CatalogueCategory);
}
