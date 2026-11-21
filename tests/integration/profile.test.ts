import { afterAll, beforeAll, describe, expect, it } from "vitest";

const testPrefix = `a02-test-${Date.now()}`;
const firstUserId = `${testPrefix}-first`;
const secondUserId = `${testPrefix}-second`;
const onboardingUserId = `${testPrefix}-onboarding`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;

let sql: SqlClient;
let profileService: typeof import("@/lib/profile/service");

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "integration-test-secret-at-least-32-characters";

  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  profileService = await import("@/lib/profile/service");

  await sql`
    insert into "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
    values
      (${firstUserId}, 'First test member', ${`${testPrefix}-first@example.test`}, true, now(), now()),
      (${secondUserId}, 'Second test member', ${`${testPrefix}-second@example.test`}, true, now(), now()),
      (${onboardingUserId}, 'Onboarding test member', ${`${testPrefix}-onboarding@example.test`}, true, now(), now())
  `;
});

afterAll(async () => {
  await sql`delete from "user" where "email" like ${`${testPrefix}%`}`;
  await sql.end();
});

describe("profile registration and privacy", () => {
  it("defaults new and existing accounts to analytics participation", async () => {
    const preferences = await sql<
      { id: string; communityAnalyticsEnabled: boolean }[]
    >`
      select "id", "community_analytics_enabled" as "communityAnalyticsEnabled"
      from "user"
      where "id" in (${firstUserId}, ${secondUserId}, ${onboardingUserId})
      order by "id"
    `;

    expect(preferences).toHaveLength(3);
    expect(preferences.every((member) => member.communityAnalyticsEnabled)).toBe(true);
  });

  it("enforces case-insensitive username uniqueness at the database", async () => {
    await sql`update "user" set "username" = 'CasePilot' where "id" = ${firstUserId}`;

    await expect(
      sql`update "user" set "username" = 'casepilot' where "id" = ${secondUserId}`,
    ).rejects.toMatchObject({ code: "23505" });

    await sql`update "user" set "username" = null where "id" = ${firstUserId}`;
  });

  it("handles normalized username collisions without overwriting registration", async () => {
    await expect(
      profileService.completeUsernameRegistration(firstUserId, "Shared_Name"),
    ).resolves.toEqual({ success: true });

    await expect(
      profileService.completeUsernameRegistration(secondUserId, "shared_name"),
    ).resolves.toEqual({
      success: false,
      field: "username",
      error: "That username is already taken.",
    });
  });

  it("persists an explicit opt-out during username onboarding", async () => {
    await expect(
      profileService.completeUsernameRegistration(onboardingUserId, "private_pilot", false),
    ).resolves.toEqual({ success: true });

    await expect(
      profileService.isCommunityAnalyticsParticipationEnabled(onboardingUserId),
    ).resolves.toBe(false);

    const invalidations = await sql<{ count: number }[]>`
      select count(*)::int as count
      from "community_aggregate_invalidation"
      where "user_id" = ${onboardingUserId}
    `;
    expect(invalidations[0]?.count).toBe(1);
  });

  it("rejects unauthenticated edits and scopes updates to the current user", async () => {
    await expect(
      profileService.updateOwnProfile(undefined, { displayName: "Intruder", bio: "No access" }),
    ).rejects.toBeInstanceOf(profileService.ProfileAuthorizationError);

    await profileService.updateOwnProfile(firstUserId, {
      displayName: "First Pilot",
      bio: "A public introduction.",
    });

    const users = await sql<
      { id: string; displayName: string | null; bio: string | null }[]
    >`
      select "id", "display_name" as "displayName", "bio"
      from "user"
      where "id" in (${firstUserId}, ${secondUserId})
      order by "id"
    `;

    expect(users.find((member) => member.id === firstUserId)).toMatchObject({
      displayName: "First Pilot",
      bio: "A public introduction.",
    });
    expect(users.find((member) => member.id === secondUserId)).toMatchObject({
      displayName: null,
      bio: null,
    });
  });

  it("returns only explicitly public profile fields", async () => {
    const profile = await profileService.getPublicProfileByUsername("SHARED_NAME");

    expect(profile).toEqual({
      username: "shared_name",
      displayName: "First Pilot",
      bio: "A public introduction.",
    });
    expect(profile).not.toHaveProperty("id");
    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("emailVerified");
    expect(profile).not.toHaveProperty("communityAnalyticsEnabled");
    expect(profile).not.toHaveProperty("communityAnalyticsUpdatedAt");
    expect(profile).not.toHaveProperty("role");
  });

  it("persists only supported administrator roles", async () => {
    await sql`update "user" set "role" = 'admin' where "id" = ${firstUserId}`;
    const administrators = await sql<{ role: string }[]>`
      select "role" from "user" where "id" = ${firstUserId}
    `;
    expect(administrators[0]?.role).toBe("admin");

    await expect(
      sql`update "user" set "role" = 'owner' where "id" = ${secondUserId}`,
    ).rejects.toMatchObject({ code: "23514" });

    await sql`update "user" set "role" = 'member' where "id" = ${firstUserId}`;
  });

  it("persists opting out and queues aggregate cache invalidation", async () => {
    await profileService.updateOwnCommunityAnalyticsPreference(firstUserId, false);

    await expect(
      profileService.isCommunityAnalyticsParticipationEnabled(firstUserId),
    ).resolves.toBe(false);
    await expect(
      profileService.isCommunityAnalyticsParticipationEnabled(secondUserId),
    ).resolves.toBe(true);

    const invalidations = await sql<{ count: number }[]>`
      select count(*)::int as count
      from "community_aggregate_invalidation"
      where "user_id" = ${firstUserId}
    `;
    expect(invalidations[0]?.count).toBe(1);
  });

  it("rejects unauthenticated preference changes and persists opting back in", async () => {
    await expect(
      profileService.updateOwnCommunityAnalyticsPreference(undefined, true),
    ).rejects.toBeInstanceOf(profileService.ProfileAuthorizationError);

    await profileService.updateOwnCommunityAnalyticsPreference(firstUserId, true);

    await expect(
      profileService.isCommunityAnalyticsParticipationEnabled(firstUserId),
    ).resolves.toBe(true);
    await expect(
      profileService.isCommunityAnalyticsParticipationEnabled(secondUserId),
    ).resolves.toBe(true);
  });

  it("protects the private account API with a verified session", async () => {
    const { NextRequest } = await import("next/server");
    const { GET } = await import("@/app/api/account/route");

    const unauthorized = await GET(new NextRequest("http://localhost:3000/api/account"));
    expect(unauthorized.status).toBe(401);

    let magicLink: string | undefined;
    const { createAuth } = await import("@/lib/auth");
    const testAuth = createAuth({
      magicLinkRateLimitMax: 100,
      rateLimitEnabled: false,
      sendMagicLink: async ({ url }) => {
        magicLink = url;
      },
    });
    const email = `${testPrefix}-api@example.test`;
    const requestResponse = await testAuth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email, callbackURL: "/account" }),
      }),
    );
    expect(requestResponse.status).toBe(200);

    const verifyResponse = await testAuth.handler(new Request(magicLink as string));
    const cookie = verifyResponse.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");

    const authorized = await GET(
      new NextRequest(`http://localhost:3000/api/account?userId=${secondUserId}`, {
        headers: { cookie },
      }),
    );
    expect(authorized.status).toBe(200);
    const body = (await authorized.json()) as { profile: Record<string, unknown> };
    expect(body.profile.email).toBe(email);
    expect(body.profile.email).not.toBe(`${testPrefix}-second@example.test`);
  });
});
