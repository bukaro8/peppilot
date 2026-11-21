import "server-only";

import { eq } from "drizzle-orm";

import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { user } from "@/lib/db/schema";
import {
  AuthorizationError,
  type AuthenticatedActor,
  type UserRole,
} from "@/lib/auth/policy";

export {
  assertAdministrator,
  assertCanManageAccount,
  assertPrivateResourceAccess,
  authorizationErrorResponse,
  AuthorizationError,
  privateResourceOwnerId,
  type AuthenticatedActor,
  type PrivateResourceOperation,
  type UserRole,
} from "@/lib/auth/policy";

export async function getAuthenticatedActor(requestHeaders: Headers) {
  const session = await getAuth().api.getSession({ headers: requestHeaders });

  if (!session) {
    return null;
  }

  const account = await getDatabase().query.user.findFirst({
    columns: { id: true, role: true },
    where: eq(user.id, session.user.id),
  });

  if (!account) {
    return null;
  }

  return {
    userId: account.id,
    role: account.role as UserRole,
  } as AuthenticatedActor;
}

export async function requireAuthenticatedActor(requestHeaders: Headers) {
  const actor = await getAuthenticatedActor(requestHeaders);

  if (!actor) {
    throw new AuthorizationError(401, "Authentication is required.");
  }

  return actor;
}

