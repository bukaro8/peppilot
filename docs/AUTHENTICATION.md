# Authentication

PepPilot uses Better Auth with passwordless, single-use email links. New and returning users use the same `/sign-in` flow; opening a valid link verifies the email and creates a database-backed session.

After first verification, members must choose an immutable public username before entering the private account area. Usernames are normalized to lowercase, limited to letters, numbers and underscores, and protected by a case-insensitive database uniqueness constraint. Display name and biography are optional and editable.

Onboarding also shows the private community-analytics preference. Participation defaults to enabled and can be disabled before registration completes or changed later in `/account`. Preference changes create a per-user invalidation marker in the same transaction so a future daily aggregation job can recalculate affected cached results. No aggregation job or public statistics are implemented yet.

## Local development

Start Docker Compose, apply migrations, and open the local mail inbox:

```sh
docker compose up --build
docker compose exec app npm run db:migrate
```

- Application: `http://localhost:3000`
- Mailpit inbox: `http://localhost:8025`

Local email is delivered only to Mailpit. Sign-in links expire after 10 minutes, are stored hashed, and can be used once.

## Configuration

`.env.example` lists local settings. Production values belong in Coolify and are listed in `.env.production.example`:

- `BETTER_AUTH_SECRET`: high-entropy secret, at least 32 characters
- `BETTER_AUTH_URL`: canonical public origin (`https://protocols.weightpilot.uk` in production)
- `EMAIL_FROM`: `PepPilot <noreply@weightpilot.uk>` in production
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`: `smtp.resend.com`, `465`, `true`
- `SMTP_USER`: `resend`
- `SMTP_PASSWORD`: the Resend API key; optional only for unauthenticated local Mailpit

Production SMTP uses implicit TLS with TLS 1.2 or newer. `BETTER_AUTH_URL` is also the sole trusted browser origin, so production magic links use `https://protocols.weightpilot.uk` and session cookies are secure.

Never log or include sign-in links, tokens, cookies, or SMTP credentials in diagnostics.

## Protected server code

Pages and server actions should call `requireActor()` from `lib/auth/session.ts` before reading or changing private data. `/account` is also covered by the Next.js proxy, while the page performs its own server-side session check as the final authorization boundary.

Future community write actions should call `requireCompletedProfile()` so authenticated members who have not selected a username are sent to `/account/register`. Public profiles are available at `/u/[username]` and select only username, display name, and biography; email and authentication records are never included.

Future aggregation code must call `isCommunityAnalyticsParticipationEnabled(userId)` immediately before including a member. After processing affected aggregates, that job can remove the member's row from `community_aggregate_invalidation`. The preference and invalidation rows are private server-side data.

## Authorisation patterns

Private API handlers use `requireAuthenticatedActor(request.headers)`. Server actions and pages use `requireActor()` or `requireCompletedProfile()`. The private `/api/account` route demonstrates a session-verified endpoint that always derives the account ID from the session and ignores client-supplied IDs.

Future protocol, injection, and journal repositories must derive new-record ownership with `privateResourceOwnerId(actor)` and call `assertPrivateResourceAccess(actor, ownerUserId, operation)` for reads, updates, and deletes. Queries should still include the actor's user ID in their database `where` clause. Administrators do not bypass this private-resource check.

Accounts have either the `member` or `admin` role. `assertAdministrator()` protects future moderation operations, while `assertCanManageAccount()` allows self-service or explicit administrator account-management operations. No public or self-service endpoint can assign roles; initial administrators must be provisioned directly through controlled database administration. Administrator status never grants access to another member's private health data.

Run the database-backed auth tests after the Compose database is migrated:

```sh
docker compose exec app npm run test:integration
```
