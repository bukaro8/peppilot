import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/lib/auth/authorization";
import { getPrivateProfile } from "@/lib/profile/service";

export async function requireActor() {
  const actor = await getAuthenticatedActor(await headers());

  if (!actor) {
    redirect("/sign-in");
  }

  return actor;
}

export async function requireCompletedProfile() {
  const actor = await requireActor();
  const profile = await getPrivateProfile(actor.userId);

  if (!profile?.username) {
    redirect("/account/register");
  }

  return { actor, profile: { ...profile, username: profile.username } };
}
