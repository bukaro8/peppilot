import { describe, expect, it } from "vitest";

import {
  assertAdministrator,
  assertCanManageAccount,
  assertPrivateResourceAccess,
  AuthorizationError,
  privateResourceOwnerId,
  type AuthenticatedActor,
  type PrivateResourceOperation,
  type UserRole,
} from "@/lib/auth/policy";

function actor(userId: string, role: UserRole = "member") {
  return { userId, role } as AuthenticatedActor;
}

describe("server-side authorization policy", () => {
  const member = actor("member-1");
  const administrator = actor("admin-1", "admin");
  const operations: PrivateResourceOperation[] = ["read", "create", "update", "delete"];

  it.each(operations)("allows an owner to %s their private resource", (operation) => {
    expect(() => assertPrivateResourceAccess(member, member.userId, operation)).not.toThrow();
    expect(privateResourceOwnerId(member)).toBe(member.userId);
  });

  it.each(operations)("rejects cross-account private %s access", (operation) => {
    expect(() => assertPrivateResourceAccess(member, "member-2", operation)).toThrowError(
      AuthorizationError,
    );
  });

  it("allows administrator-only account management", () => {
    expect(() => assertAdministrator(administrator)).not.toThrow();
    expect(() => assertCanManageAccount(administrator, "member-1")).not.toThrow();
    expect(() => assertCanManageAccount(member, member.userId)).not.toThrow();
    expect(() => assertAdministrator(member)).toThrowError(AuthorizationError);
    expect(() => assertCanManageAccount(member, "member-2")).toThrowError(AuthorizationError);
  });

  it.each(operations)(
    "does not grant administrators implicit private-health %s access",
    (operation) => {
      expect(() => assertPrivateResourceAccess(administrator, "member-1", operation)).toThrowError(
        AuthorizationError,
      );
    },
  );
});
