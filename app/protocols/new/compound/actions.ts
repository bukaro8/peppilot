"use server";

import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/session";
import { createPrivateCompound, PrivateCompoundError } from "@/lib/catalogue/private-compound";

export async function createPrivateCompoundAction(data: FormData) {
  const actor = await requireActor();
  let result;
  try { result = await createPrivateCompound(actor, { name: String(data.get("name") ?? ""), kind: String(data.get("kind") ?? ""), ingredients: String(data.get("ingredients") ?? "") }); } catch (error) { if (error instanceof PrivateCompoundError) redirect(`/protocols/new/compound?error=${encodeURIComponent(error.message)}`); throw error; }
  redirect(`/protocols/new?catalogue=${encodeURIComponent(result.id)}`);
}
