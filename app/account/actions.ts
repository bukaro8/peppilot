"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor, requireCompletedProfile } from "@/lib/auth/session";
import { updateDisabledInjectionSiteIds } from "@/lib/injection/rotation-service";
import { injectionSites, isInjectionSiteId } from "@/lib/injection/sites";
import {
  completeUsernameRegistration,
  updateOwnCommunityAnalyticsPreference,
  updateOwnProfile,
} from "@/lib/profile/service";
import type { ProfileActionState } from "@/lib/profile/action-state";

export type InjectionSitePreferenceActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export async function completeRegistrationAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const actor = await requireActor();
  const result = await completeUsernameRegistration(
    actor.userId,
    String(formData.get("username") ?? ""),
    formData.get("communityAnalyticsEnabled") === "on",
  );

  if (!result.success) {
    return { status: "error", field: result.field, message: result.error };
  }

  revalidatePath("/account");
  redirect("/account");
}

export async function updateCommunityAnalyticsPreferenceAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { actor } = await requireCompletedProfile();
  await updateOwnCommunityAnalyticsPreference(
    actor.userId,
    formData.get("communityAnalyticsEnabled") === "on",
  );

  revalidatePath("/account");
  return { status: "success", message: "Privacy preference saved." };
}

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { actor, profile } = await requireCompletedProfile();
  const result = await updateOwnProfile(actor.userId, {
    displayName: String(formData.get("displayName") ?? ""),
    bio: String(formData.get("bio") ?? ""),
  });

  if (!result.success) {
    return { status: "error", field: result.field, message: result.error };
  }

  revalidatePath("/account");
  revalidatePath(`/u/${profile.username}`);
  return { status: "success", message: "Profile saved." };
}

export async function updateInjectionSitePreferencesAction(
  _previousState: InjectionSitePreferenceActionState,
  formData: FormData,
): Promise<InjectionSitePreferenceActionState> {
  const { actor } = await requireCompletedProfile();
  const enabledValues = formData.getAll("enabledSiteIds").map(String);
  if (enabledValues.some((siteId) => !isInjectionSiteId(siteId))) {
    return { status: "error", message: "Choose valid injection sites." };
  }
  const enabled = new Set(enabledValues);
  const disabled = injectionSites
    .map((site) => site.id)
    .filter((siteId) => !enabled.has(siteId));
  await updateDisabledInjectionSiteIds(actor, disabled);
  revalidatePath("/account");
  revalidatePath("/injections/new");
  return { status: "success", message: "Injection site preferences saved." };
}
