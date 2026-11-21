import postgres from "postgres";
import { readFile } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed initial data.");
}

const client = postgres(databaseUrl, { max: 1 });
const catalogue = JSON.parse(
  await readFile(new URL("./catalogue-reference.json", import.meta.url), "utf8"),
);

try {
  const inserted = await client.begin(async (sql) => {
    const health = await sql`
      insert into app_health (id, created_at)
      overriding system value
      values (-1, now())
      on conflict (id) do nothing
      returning id
    `;

    let entryCount = 0;
    for (const entry of catalogue.entries) {
      const rows = await sql`
        insert into catalogue_entry (
          id, slug, display_name, category, kind, description, tracking_focus
        ) values (
          ${entry.id}, ${entry.slug}, ${entry.displayName}, ${entry.category}, ${entry.kind},
          ${entry.description}, ${entry.trackingFocus}
        )
        on conflict (id) do nothing
        returning id
      `;
      entryCount += rows.length;
    }

    let ingredientCount = 0;
    for (const ingredient of catalogue.ingredients) {
      const rows = await sql`
        insert into catalogue_entry_ingredient (
          catalogue_entry_id, ingredient_slug, display_name, linked_catalogue_entry_id, position
        ) values (
          ${ingredient.catalogueEntryId}, ${ingredient.ingredientSlug}, ${ingredient.displayName},
          ${ingredient.linkedCatalogueEntryId}, ${ingredient.position}
        )
        on conflict (catalogue_entry_id, ingredient_slug) do nothing
        returning catalogue_entry_id
      `;
      ingredientCount += rows.length;
    }

    return { entryCount, healthCount: health.length, ingredientCount };
  });

  console.log(
    `Initial seed complete: ${inserted.entryCount} catalogue entries and ${inserted.ingredientCount} ingredient links added.`,
  );
} finally {
  await client.end({ timeout: 5 });
}
