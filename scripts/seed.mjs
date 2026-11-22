import postgres from "postgres";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed initial data.");
}

const client = postgres(databaseUrl, { max: 1 });
const catalogue = JSON.parse(
  await readFile(new URL("./catalogue-reference.json", import.meta.url), "utf8"),
);
const approvedSource = await readFile(
  new URL("./peptide-protocols-approved.json", import.meta.url),
  "utf8",
);
const approved = JSON.parse(approvedSource);
const approvedCategories = ["conservative", "most_used", "adventurous"];
const approvedChecksum = createHash("sha256").update(approvedSource).digest("hex");

if (approved.schema_version !== "1.2.0" || approved.compounds?.length !== 28) {
  throw new Error("Approved protocol source must be schema 1.2.0 with 28 compounds.");
}
const protocolCount = approved.compounds.reduce(
  (count, compound) =>
    count + approvedCategories.filter((category) => compound.protocols?.[category]).length,
  0,
);
if (protocolCount !== 84) {
  throw new Error(`Approved protocol source must contain 84 protocols; found ${protocolCount}.`);
}

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
        on conflict (id) do update set
          display_name = excluded.display_name,
          category = excluded.category,
          kind = excluded.kind,
          description = excluded.description,
          tracking_focus = excluded.tracking_focus,
          is_active = true,
          updated_at = now()
        returning id
      `;
      entryCount += rows.length;
    }

    let ingredientCount = 0;
    for (const ingredient of catalogue.ingredients) {
      const rows = await sql`
        insert into catalogue_entry_ingredient (
          catalogue_entry_id, ingredient_slug, display_name, linked_catalogue_entry_id,
          composition, position
        ) values (
          ${ingredient.catalogueEntryId}, ${ingredient.ingredientSlug}, ${ingredient.displayName},
          ${ingredient.linkedCatalogueEntryId}, ${ingredient.composition ?? null}, ${ingredient.position}
        )
        on conflict (catalogue_entry_id, ingredient_slug) do update set
          display_name = excluded.display_name,
          linked_catalogue_entry_id = excluded.linked_catalogue_entry_id,
          composition = excluded.composition,
          position = excluded.position
        returning catalogue_entry_id
      `;
      ingredientCount += rows.length;
    }

    const catalogueBySlug = new Map(catalogue.entries.map((entry) => [entry.slug, entry.id]));
    let approvedProtocolCount = 0;
    for (const compound of approved.compounds) {
      const catalogueEntryId = catalogueBySlug.get(compound.slug);
      if (!catalogueEntryId) {
        throw new Error(`Approved protocol compound has no catalogue match: ${compound.slug}`);
      }
      const compoundContext = { ...compound };
      delete compoundContext.protocols;
      for (const category of approvedCategories) {
        const definition = compound.protocols?.[category];
        if (!definition) {
          throw new Error(`Missing approved ${category} protocol for ${compound.slug}.`);
        }
        const rows = await sql`
          insert into approved_protocol_preset (
            id, catalogue_entry_id, category, schema_version, duration_type,
            definition, compound_context, source_checksum, is_active
          ) values (
            ${`approved:${compound.slug}:${category}`}, ${catalogueEntryId}, ${category},
            ${approved.schema_version}, ${definition.duration_type},
            ${sql.json(definition)}, ${sql.json(compoundContext)}, ${approvedChecksum}, true
          )
          on conflict (catalogue_entry_id, category) do update set
            schema_version = excluded.schema_version,
            duration_type = excluded.duration_type,
            definition = excluded.definition,
            compound_context = excluded.compound_context,
            source_checksum = excluded.source_checksum,
            is_active = true,
            updated_at = now()
          returning id
        `;
        approvedProtocolCount += rows.length;
      }
    }

    return { approvedProtocolCount, entryCount, healthCount: health.length, ingredientCount };
  });

  console.log(
    `Initial seed complete: ${inserted.entryCount} catalogue entries, ${inserted.ingredientCount} ingredient links, and ${inserted.approvedProtocolCount} approved protocols synchronized.`,
  );
} finally {
  await client.end({ timeout: 5 });
}
