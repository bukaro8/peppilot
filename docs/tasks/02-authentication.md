# PepPilot — Section 02: Authentication & User Profiles

**Purpose:** Secure passwordless accounts, unique public usernames and private-by-default member data.

**Reference:** `AGENTS.md` and relevant sections of `docs/PROJECT_CONTEXT.md`.
**Prerequisite:** Section 01 completed (Next.js, Drizzle/PostgreSQL, Docker, migration and test workflows).

## Working rules

Implement **one task at a time**, in order. Follow existing project conventions and keep dependencies minimal. Create and commit versioned Drizzle migrations when changing schema; don't regenerate migrations on deployment. Verify locally with Docker. At the end of each task, report changes, tests and any unresolved issues briefly.

## A01 — Authentication foundation

**Implement**
- Add a maintained Next.js-compatible authentication solution supporting passwordless email sign-in (one-time code **or** magic link; choose one simple flow, not both initially).
- Create required account, session and verification-token database schema and migration(s).
- Provide an email sending adapter with environment-based configuration; ensure development can inspect test emails without sending real messages.
- Implement sign-in, session creation, sign-out and session expiry; allow requesting a fresh code/link.
- Protect against account enumeration, token reuse and brute-force requests using expiration, one-use tokens and rate limits.

**Acceptance criteria**
- A member can request an email sign-in, verify it and access a persistent authenticated session.
- Expired/used tokens are rejected; invalid requests don't reveal whether an email exists.
- Credentials, sign-in tokens and private account data never enter client logs or public responses.
- Auth flow tests pass without requiring a real email provider.

## A02 — Registration and public username

**Implement**
- On first successful email verification, direct new members through minimal onboarding.
- Require a unique public username before participation in community features; define case-insensitive uniqueness and basic format rules.
- Keep email addresses private and separate from public username/profile records.
- Handle username collisions gracefully; support an editable display name as an optional profile field, without changing username identity.

**Acceptance criteria**
- Registration cannot be completed without a valid available username.
- Duplicate usernames differing only by case are rejected at database level.
- No email address appears in public profile responses.

## A03 — Privacy preferences and member settings

**Implement**
- During onboarding, clearly explain anonymous aggregate-statistics participation, showing an **opt-out** control (enabled by default per product decision).
- Store each member's current participation choice and permit changing it later in account settings.
- Keep aggregate-statistics participation independent from publishing community posts or reports.
- Provide simple private account settings and profile editing; record preference changes so subsequent aggregate calculations can honour them.

**Acceptance criteria**
- New members can opt out before finishing registration.
- Participation preference persists across sign-ins and can be updated.
- A member's preference and email aren't exposed by public endpoints.
- No community analytics implementation is added in this section.

## A04 — Authorisation boundaries and public profiles

**Implement**
- Add reusable server-side helpers for requiring a session and identifying the current member.
- Ensure all private-account read/write operations are scoped to that member, not merely hidden in the UI.
- Add a minimal public profile route/page displaying only explicitly public fields (e.g. username and optional display name).
- Establish a lightweight admin-role mechanism for later moderation, without building the moderation dashboard.

**Acceptance criteria**
- Unauthenticated users cannot access member settings.
- One authenticated member cannot read or change another member's private data by altering an ID or URL.
- Public profiles remain browsable without sign-in and never expose email, sessions or private health information.
- Admin capability is provisioned securely and cannot be self-assigned during registration.

## A05 — Account UX, tests and documentation

**Implement**
- Finish mobile-friendly sign-in, verification, onboarding, account settings and sign-out pages, including accessible validation, loading and error states.
- Add automated tests for token expiry/replay, username uniqueness, privacy-setting persistence and authorisation isolation.
- Document environment variables, local test-email workflow and minimal setup in existing docs (link to them instead of duplicating instructions).

**Acceptance criteria**
- Key account flows work from a mobile-sized browser and desktop.
- `npm test`, lint, typecheck and production Docker build pass; any checks not run are explicitly reported.
- Existing migration, seed, Compose and Coolify workflows remain functional.

## Section complete when

A user can sign in without a password, register a unique public username, manage their analytics opt-out, view their private settings, sign out, and visit another member's limited public profile. Authentication and authorisation tests pass.

**Out of scope:** peptide catalogue, health journal, protocols, injections, body map, posts/comments/likes, community statistics, push notifications, social login, inventory and automatic community publishing.
