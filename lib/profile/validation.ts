export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const BIO_MAX_LENGTH = 280;

const usernamePattern = /^[a-z0-9_]+$/;

const reservedUsernames = new Set([
  "account",
  "admin",
  "administrator",
  "api",
  "auth",
  "community",
  "help",
  "login",
  "logout",
  "moderator",
  "peppilot",
  "privacy",
  "profile",
  "register",
  "root",
  "settings",
  "signin",
  "signup",
  "support",
  "system",
  "terms",
  "user",
  "users",
  "www",
]);

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): ValidationResult<string> {
  const username = normalizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Username must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters.`,
    };
  }

  if (!usernamePattern.test(username)) {
    return {
      success: false,
      error: "Use only letters, numbers, and underscores.",
    };
  }

  if (reservedUsernames.has(username)) {
    return { success: false, error: "That username is reserved." };
  }

  return { success: true, value: username };
}

export function validateDisplayName(value: string): ValidationResult<string | null> {
  const displayName = value.trim();

  if (!displayName) {
    return { success: true, value: null };
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { success: true, value: displayName };
}

export function validateBio(value: string): ValidationResult<string | null> {
  const bio = value.trim();

  if (!bio) {
    return { success: true, value: null };
  }

  if (bio.length > BIO_MAX_LENGTH) {
    return {
      success: false,
      error: `Biography must be ${BIO_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { success: true, value: bio };
}
