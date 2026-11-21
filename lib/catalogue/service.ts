import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";

import { isCatalogueCategory, type CatalogueCategory } from "@/lib/catalogue/constants";
import { getDatabase } from "@/lib/db";
import { catalogueEntry, catalogueEntryIngredient } from "@/lib/db/schema";

type CatalogueQuery = {
  category?: CatalogueCategory;
  includeInactive?: boolean;
  query?: string;
};

export async function getCatalogueEntries(options: CatalogueQuery = {}) {
  const database = getDatabase();
  const query = options.query?.trim().slice(0, 80);
  const filters = [
    options.includeInactive ? undefined : eq(catalogueEntry.isActive, true),
    options.category && isCatalogueCategory(options.category)
      ? eq(catalogueEntry.category, options.category)
      : undefined,
    query
      ? or(
          ilike(catalogueEntry.displayName, `%${query}%`),
          ilike(catalogueEntry.description, `%${query}%`),
          ilike(catalogueEntry.trackingFocus, `%${query}%`),
        )
      : undefined,
  ].filter((filter) => filter !== undefined);

  return database
    .select({
      id: catalogueEntry.id,
      slug: catalogueEntry.slug,
      displayName: catalogueEntry.displayName,
      category: catalogueEntry.category,
      kind: catalogueEntry.kind,
      description: catalogueEntry.description,
      trackingFocus: catalogueEntry.trackingFocus,
      isActive: catalogueEntry.isActive,
    })
    .from(catalogueEntry)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(catalogueEntry.displayName));
}

export async function getCatalogueEntryBySlug(slug: string, includeInactive = false) {
  const database = getDatabase();
  const normalizedSlug = slug.trim().toLowerCase();
  const [entry] = await database
    .select({
      id: catalogueEntry.id,
      slug: catalogueEntry.slug,
      displayName: catalogueEntry.displayName,
      category: catalogueEntry.category,
      kind: catalogueEntry.kind,
      description: catalogueEntry.description,
      trackingFocus: catalogueEntry.trackingFocus,
      isActive: catalogueEntry.isActive,
    })
    .from(catalogueEntry)
    .where(
      and(
        eq(catalogueEntry.slug, normalizedSlug),
        includeInactive ? undefined : eq(catalogueEntry.isActive, true),
      ),
    )
    .limit(1);

  if (!entry) {
    return null;
  }

  const ingredients = await database
    .select({
      slug: catalogueEntryIngredient.ingredientSlug,
      displayName: catalogueEntryIngredient.displayName,
      linkedCatalogueEntryId: catalogueEntryIngredient.linkedCatalogueEntryId,
      position: catalogueEntryIngredient.position,
    })
    .from(catalogueEntryIngredient)
    .where(eq(catalogueEntryIngredient.catalogueEntryId, entry.id))
    .orderBy(asc(catalogueEntryIngredient.position));

  return { ...entry, ingredients };
}
