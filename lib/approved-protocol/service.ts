import "server-only";

import { getPostgresClient } from "@/lib/db";
import type { ApprovedProtocolPreset } from "@/lib/approved-protocol/types";

export async function getApprovedProtocolCatalogue() {
  const sql = getPostgresClient();
  return sql<Array<{
    catalogueEntryId: string;
    category: string;
    displayName: string;
    kind: string;
    presetCount: number;
    slug: string;
  }>>`
    select catalogue.id as "catalogueEntryId", catalogue.slug,
      catalogue.display_name as "displayName", catalogue.kind,
      catalogue.category, count(preset.id)::int as "presetCount"
    from catalogue_entry catalogue
    join approved_protocol_preset preset
      on preset.catalogue_entry_id = catalogue.id and preset.is_active = true
    where catalogue.is_active = true
    group by catalogue.id
    having count(preset.id) = 3
    order by catalogue.display_name
  `;
}

export async function getApprovedProtocolsBySlug(slug: string) {
  const sql = getPostgresClient();
  return sql<ApprovedProtocolPreset[]>`
    select preset.id, preset.catalogue_entry_id as "catalogueEntryId",
      catalogue.slug as "catalogueSlug", catalogue.display_name as "displayName",
      preset.category, preset.schema_version as "schemaVersion",
      preset.duration_type as "durationType", preset.definition,
      preset.compound_context as "compoundContext"
    from approved_protocol_preset preset
    join catalogue_entry catalogue on catalogue.id = preset.catalogue_entry_id
    where catalogue.slug = ${slug} and catalogue.is_active = true and preset.is_active = true
    order by case preset.category
      when 'conservative' then 1 when 'most_used' then 2 else 3 end
  `;
}

export async function getApprovedProtocolPreset(id: string) {
  const sql = getPostgresClient();
  const [preset] = await sql<ApprovedProtocolPreset[]>`
    select preset.id, preset.catalogue_entry_id as "catalogueEntryId",
      catalogue.slug as "catalogueSlug", catalogue.display_name as "displayName",
      preset.category, preset.schema_version as "schemaVersion",
      preset.duration_type as "durationType", preset.definition,
      preset.compound_context as "compoundContext"
    from approved_protocol_preset preset
    join catalogue_entry catalogue on catalogue.id = preset.catalogue_entry_id
    where preset.id = ${id} and catalogue.is_active = true and preset.is_active = true
    limit 1
  `;
  return preset ?? null;
}
