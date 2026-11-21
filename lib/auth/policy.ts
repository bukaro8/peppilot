import "server-only";

export type UserRole = "member" | "admin";
export type PrivateResourceOperation = "read" | "create" | "update" | "delete";

declare const actorBrand: unique symbol;

export type AuthenticatedActor = {
  readonly userId: string;
  readonly role: UserRole;
  readonly [actorBrand]: true;
};

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export function privateResourceOwnerId(actor: AuthenticatedActor) {
  return actor.userId;
}

export function assertPrivateResourceAccess(
  actor: AuthenticatedActor,
  ownerUserId: string,
  operation: PrivateResourceOperation,
) {
  if (actor.userId !== ownerUserId) {
    throw new AuthorizationError(
      403,
      `You cannot ${operation} another member's private data.`,
    );
  }
}

export function assertAdministrator(actor: AuthenticatedActor) {
  if (actor.role !== "admin") {
    throw new AuthorizationError(403, "Administrator access is required.");
  }
}

export function assertCanManageAccount(actor: AuthenticatedActor, accountUserId: string) {
  if (actor.userId !== accountUserId) {
    assertAdministrator(actor);
  }
}

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  throw error;
}
