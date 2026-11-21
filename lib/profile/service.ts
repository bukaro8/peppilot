import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { PostgresError } from "postgres";

import { getDatabase } from "@/lib/db";
import { communityAggregateInvalidation, user } from "@/lib/db/schema";
import {
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateUsername,
} from "@/lib/profile/validation";

export class ProfileAuthorizationError extends Error {
  constructor() {
    super("You must be signed in to update this profile.");
    this.name = "ProfileAuthorizationError";
  }
}

export type ProfileMutationResult =
  | { success: true }
  | {
      success: false;
      field: "username" | "displayName" | "bio" | "communityAnalyticsEnabled";
      error: string;
    };

function isUniqueViolation(error: unknown) {
  let current = error;

  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (current instanceof PostgresError && current.code === "23505") {
      return true;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

function requireActor(actorUserId: string | undefined) {
  if (!actorUserId) {
    throw new ProfileAuthorizationError();
  }

  return actorUserId;
}

export async function completeUsernameRegistration(
  actorUserId: string | undefined,
  usernameInput: string,
  communityAnalyticsEnabled = true,
): Promise<ProfileMutationResult> {
  const userId = requireActor(actorUserId);
  const validation = validateUsername(usernameInput);

  if (!validation.success) {
    return { success: false, field: "username", error: validation.error };
  }

  try {
    const updated = await getDatabase().transaction(async (transaction) => {
      const now = new Date();
      const registered = await transaction
        .update(user)
        .set({
          username: validation.value,
          communityAnalyticsEnabled,
          communityAnalyticsUpdatedAt: now,
          updatedAt: now,
        })
        .where(and(eq(user.id, userId), isNull(user.username)))
        .returning({ username: user.username });

      if (registered.length > 0 && !communityAnalyticsEnabled) {
        await transaction
          .insert(communityAggregateInvalidation)
          .values({ userId, invalidatedAt: now })
          .onConflictDoUpdate({
            target: communityAggregateInvalidation.userId,
            set: { invalidatedAt: now },
          });
      }

      return registered;
    });

    if (updated.length === 0) {
      return {
        success: false,
        field: "username",
        error: "Your public username has already been registered.",
      };
    }

    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, field: "username", error: "That username is already taken." };
    }

    throw error;
  }
}

export async function updateOwnCommunityAnalyticsPreference(
  actorUserId: string | undefined,
  communityAnalyticsEnabled: boolean,
): Promise<ProfileMutationResult> {
  const userId = requireActor(actorUserId);

  return getDatabase().transaction(async (transaction) => {
    const current = await transaction.query.user.findFirst({
      columns: { communityAnalyticsEnabled: true },
      where: eq(user.id, userId),
    });

    if (!current) {
      throw new ProfileAuthorizationError();
    }

    if (current.communityAnalyticsEnabled === communityAnalyticsEnabled) {
      return { success: true };
    }

    const now = new Date();
    await transaction
      .update(user)
      .set({ communityAnalyticsEnabled, communityAnalyticsUpdatedAt: now, updatedAt: now })
      .where(eq(user.id, userId));

    await transaction
      .insert(communityAggregateInvalidation)
      .values({ userId, invalidatedAt: now })
      .onConflictDoUpdate({
        target: communityAggregateInvalidation.userId,
        set: { invalidatedAt: now },
      });

    return { success: true };
  });
}

export async function isCommunityAnalyticsParticipationEnabled(userId: string) {
  const preference = await getDatabase().query.user.findFirst({
    columns: { communityAnalyticsEnabled: true },
    where: eq(user.id, userId),
  });

  return preference?.communityAnalyticsEnabled === true;
}

export async function updateOwnProfile(
  actorUserId: string | undefined,
  input: { displayName: string; bio: string },
): Promise<ProfileMutationResult> {
  const userId = requireActor(actorUserId);
  const displayName = validateDisplayName(input.displayName);

  if (!displayName.success) {
    return { success: false, field: "displayName", error: displayName.error };
  }

  const bio = validateBio(input.bio);

  if (!bio.success) {
    return { success: false, field: "bio", error: bio.error };
  }

  const updated = await getDatabase()
    .update(user)
    .set({ displayName: displayName.value, bio: bio.value, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  if (updated.length === 0) {
    throw new ProfileAuthorizationError();
  }

  return { success: true };
}

export async function getPrivateProfile(userId: string) {
  return getDatabase().query.user.findFirst({
    columns: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      communityAnalyticsEnabled: true,
      communityAnalyticsUpdatedAt: true,
    },
    where: eq(user.id, userId),
  });
}

export async function getPublicProfileByUsername(usernameInput: string) {
  const username = normalizeUsername(usernameInput);

  return getDatabase().query.user.findFirst({
    columns: {
      username: true,
      displayName: true,
      bio: true,
    },
    where: sql`lower(${user.username}) = ${username}`,
  });
}
