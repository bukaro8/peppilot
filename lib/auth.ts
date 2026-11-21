import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";

import { getDatabase } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendMagicLinkEmail } from "@/lib/email";

type MagicLinkSender = (message: { to: string; url: string }) => Promise<void>;

type CreateAuthOptions = {
  magicLinkExpiresIn?: number;
  magicLinkRateLimitMax?: number;
  rateLimitEnabled?: boolean;
  sendMagicLink?: MagicLinkSender;
};

export function createAuth(options: CreateAuthOptions = {}) {
  const baseURL = process.env.BETTER_AUTH_URL;

  return betterAuth({
    appName: "PepPilot",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema,
    }),
    user: {
      additionalFields: {
        username: {
          type: "string",
          required: false,
          input: false,
        },
        displayName: {
          type: "string",
          required: false,
          input: false,
        },
        bio: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: options.rateLimitEnabled ?? true,
      window: 60,
      max: 30,
    },
    advanced: {
      cookiePrefix: "peppilot",
      disableOriginCheck: false,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    trustedOrigins: baseURL ? [baseURL] : [],
    plugins: [
      magicLink({
        expiresIn: options.magicLinkExpiresIn ?? 60 * 10,
        rateLimit: {
          window: 60,
          max: options.magicLinkRateLimitMax ?? 3,
        },
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await (options.sendMagicLink ?? sendMagicLinkEmail)({ to: email, url });
        },
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
