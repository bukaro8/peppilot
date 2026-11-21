import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const baseURL = "http://localhost:3000";
const emailPrefix = `a01-test-${Date.now()}`;

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;

let createAuth: (typeof import("@/lib/auth"))["createAuth"];
let sql: SqlClient;

function request(path: string, init?: RequestInit) {
  return new Request(`${baseURL}/api/auth${path}`, {
    ...init,
    headers: {
      origin: baseURL,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

async function requestMagicLink(email: string) {
  let magicLink: string | undefined;
  const testAuth = createAuth({
    magicLinkRateLimitMax: 100,
    rateLimitEnabled: false,
    sendMagicLink: async ({ url }) => {
      magicLink = url;
    },
  });

  const response = await testAuth.handler(
    request("/sign-in/magic-link", {
      method: "POST",
      body: JSON.stringify({
        email,
        callbackURL: "/account",
        errorCallbackURL: "/sign-in?error=invalid-link",
      }),
    }),
  );

  expect(response.status).toBe(200);
  expect(magicLink).toBeDefined();

  return { auth: testAuth, magicLink: magicLink as string };
}

beforeAll(async () => {
  process.env.BETTER_AUTH_URL = baseURL;
  process.env.BETTER_AUTH_SECRET = "integration-test-secret-at-least-32-characters";

  ({ createAuth } = await import("@/lib/auth"));
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
});

afterAll(async () => {
  await sql`delete from "verification" where "identifier" like ${`%${emailPrefix}%`}`;
  await sql`delete from "user" where "email" like ${`${emailPrefix}%`}`;
  await sql.end();
});

describe("passwordless authentication", () => {
  it("creates a database session, reads it, and revokes it on sign out", async () => {
    const email = `${emailPrefix}-session@example.test`;
    const result = await requestMagicLink(email);

    const verifyResponse = await result.auth.handler(new Request(result.magicLink));
    expect(verifyResponse.status).toBe(302);

    const cookie = cookieHeader(verifyResponse);
    expect(cookie).toContain("peppilot.session_token=");
    expect(verifyResponse.headers.get("set-cookie")).toContain("HttpOnly");
    expect(verifyResponse.headers.get("set-cookie")).toContain("SameSite=Lax");

    const session = await result.auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session?.user.email).toBe(email);
    expect(session?.user.emailVerified).toBe(true);

    const signOutResponse = await result.auth.handler(
      request("/sign-out", {
        method: "POST",
        headers: { cookie },
        body: "{}",
      }),
    );
    expect(signOutResponse.status).toBe(200);

    const endedSession = await result.auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(endedSession).toBeNull();
  });

  it("rejects a reused magic link without creating another session", async () => {
    const email = `${emailPrefix}-reused@example.test`;
    const result = await requestMagicLink(email);

    const firstResponse = await result.auth.handler(new Request(result.magicLink));
    expect(firstResponse.status).toBe(302);

    const secondResponse = await result.auth.handler(new Request(result.magicLink));
    expect(secondResponse.status).toBe(302);
    expect(cookieHeader(secondResponse)).not.toContain("session_token=");

    const sessions = await sql<{ count: number }[]>`
      select count(*)::int as count
      from "session"
      join "user" on "user"."id" = "session"."user_id"
      where "user"."email" = ${email}
    `;
    expect(sessions[0]?.count).toBe(1);
  });

  it("rejects an expired magic link", async () => {
    const email = `${emailPrefix}-expired@example.test`;
    let magicLink: string | undefined;
    const auth = createAuth({
      magicLinkExpiresIn: -1,
      magicLinkRateLimitMax: 100,
      rateLimitEnabled: false,
      sendMagicLink: async ({ url }) => {
        magicLink = url;
      },
    });

    const requestResponse = await auth.handler(
      request("/sign-in/magic-link", {
        method: "POST",
        body: JSON.stringify({
          email,
          callbackURL: "/account",
          errorCallbackURL: "/sign-in?error=invalid-link",
        }),
      }),
    );
    expect(requestResponse.status).toBe(200);
    expect(magicLink).toBeDefined();

    const verifyResponse = await auth.handler(new Request(magicLink as string));
    expect(verifyResponse.status).toBe(302);
    expect(cookieHeader(verifyResponse)).not.toContain("session_token=");

    const sessions = await sql<{ count: number }[]>`
      select count(*)::int as count
      from "session"
      join "user" on "user"."id" = "session"."user_id"
      where "user"."email" = ${email}
    `;
    expect(sessions[0]?.count).toBe(0);
  });

  it("uses the production origin and secure cookies for production magic links", async () => {
    const productionOrigin = "https://protocols.weightpilot.uk";
    vi.stubEnv("BETTER_AUTH_URL", productionOrigin);
    vi.stubEnv("NODE_ENV", "production");
    let magicLink: string | undefined;
    try {
      const productionAuth = createAuth({
        magicLinkRateLimitMax: 100,
        rateLimitEnabled: false,
        sendMagicLink: async ({ url }) => { magicLink = url; },
      });
      const response = await productionAuth.handler(new Request(`${productionOrigin}/api/auth/sign-in/magic-link`, {
        method: "POST",
        body: JSON.stringify({ email: `${emailPrefix}-production@example.test`, callbackURL: "/account" }),
        headers: { "content-type": "application/json", origin: productionOrigin },
      }));
      expect(response.status).toBe(200);
      expect(new URL(magicLink as string).origin).toBe(productionOrigin);

      const verifyResponse = await productionAuth.handler(new Request(magicLink as string));
      expect(verifyResponse.headers.get("set-cookie")).toContain("Secure");
      const productionCookie = cookieHeader(verifyResponse);

      const untrustedResponse = await productionAuth.handler(new Request(`${productionOrigin}/api/auth/sign-out`, {
        method: "POST",
        body: "{}",
        headers: {
          "content-type": "application/json",
          cookie: productionCookie,
          origin: "https://attacker.example",
        },
      }));
      expect(untrustedResponse.status).toBe(403);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
