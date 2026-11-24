import "server-only";
import type { AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";

export class PrivateCompoundError extends Error {}

export async function createPrivateCompound(actor: AuthenticatedActor, input: { name: string; kind: string; ingredients: string }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100 || !["peptide", "blend"].includes(input.kind)) throw new PrivateCompoundError("Enter a compound name (2–100 characters) and valid type.");
  const ingredients = input.ingredients.split("\n").map((value) => value.trim()).filter(Boolean);
  if (input.kind === "blend" && (ingredients.length < 2 || ingredients.length > 20 || ingredients.some((value) => value.length > 100))) throw new PrivateCompoundError("Enter 2–20 blend ingredients, one per line (up to 100 characters each).");
  const id = crypto.randomUUID();
  await getPostgresClient().begin(async (sql) => {
    await sql`insert into catalogue_entry (id, slug, display_name, category, kind, owner_user_id) values (${id}, ${`private-${id}`}, ${name}, 'metabolic_wellness', ${input.kind}, ${actor.userId})`;
    if (input.kind === "blend") for (const [position, ingredient] of ingredients.entries()) await sql`insert into catalogue_entry_ingredient (catalogue_entry_id, ingredient_slug, display_name, position) values (${id}, ${`ingredient-${position + 1}`}, ${ingredient}, ${position + 1})`;
  });
  return { id };
}
