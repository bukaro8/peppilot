import { describe, expect, it } from "vitest";

import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  validateBio,
  validateDisplayName,
  validateUsername,
} from "@/lib/profile/validation";

describe("profile validation", () => {
  it("normalizes a valid username", () => {
    expect(validateUsername("  Pilot_24  ")).toEqual({ success: true, value: "pilot_24" });
  });

  it.each([
    ["ab", "Username must be 3–30 characters."],
    ["a".repeat(31), "Username must be 3–30 characters."],
    ["pilot-name", "Use only letters, numbers, and underscores."],
    ["pilot name", "Use only letters, numbers, and underscores."],
  ])("rejects invalid username %s", (username, error) => {
    expect(validateUsername(username)).toEqual({ success: false, error });
  });

  it.each(["admin", "PepPilot", " SUPPORT "])("rejects reserved username %s", (username) => {
    expect(validateUsername(username)).toEqual({
      success: false,
      error: "That username is reserved.",
    });
  });

  it("validates optional public profile fields", () => {
    expect(validateDisplayName("   ")).toEqual({ success: true, value: null });
    expect(validateBio("   ")).toEqual({ success: true, value: null });
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH + 1)).success).toBe(false);
    expect(validateBio("x".repeat(BIO_MAX_LENGTH + 1)).success).toBe(false);
  });
});
