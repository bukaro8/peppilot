# PepPilot — Codex Instructions

## Project
- PepPilot is a multi-user peptide tracking website and installable PWA, initially hosted at `track.weightpilot.uk`.
- Treat `docs/PROJECT_CONTEXT.md` as the source of truth for confirmed product decisions. Read the relevant sections before implementing a feature; do not load or rewrite the whole document unnecessarily.
- Follow the current task and acceptance criteria. Ask only when an essential decision is missing; do not invent protocol templates, doses, or medical claims.
- Keep implementation focused and simple. Do not add unrequested features.

## Stack and environments
- Use Next.js, TypeScript, Tailwind CSS, PostgreSQL and Drizzle ORM unless a task explicitly changes the stack.
- Development runs locally with Docker; production runs in Coolify using Docker on the user's server.
- Keep development and production databases, secrets and configuration separate. Provide an accurate `.env.example`; never commit secrets.
- Use a multi-stage production Dockerfile and a Docker Compose setup with persistent PostgreSQL data and application health checks.

## Database and deployment
- Use versioned Drizzle migrations: generate migration files during development and apply pending migrations during deployment; never auto-generate schema changes on production startup.
- Fail deployment safely if a migration fails. Preserve existing user data and avoid concurrent migration runs.
- Provide repeatable, idempotent seed scripts for the initial catalogue/reference data.
- Keep synthetic demo seeding separate and explicitly gated so the 20 fictional users and their posts cannot be inserted accidentally into production.

## Product and data rules
- Protect private records with server-side authorisation scoped to the signed-in user; public profiles and reports expose only information explicitly intended for publication.
- Passwordless authentication and unique public usernames are required.
- Community aggregates use opted-in structured data, matching protocol-template versions and weekly median percentage changes. Require at least 10 contributors per displayed metric/week, using actual measurements without filling missing weeks.
- Preserve historical injection logs and protocol changes. The injection-site rotation/history must consider all injections across a user's protocols.
- For V1, reminders are in-app only. Do not add push/email reminders or automatic inventory tracking unless requested.
- Keep synthetic/demo data clearly marked and excluded from genuine community statistics.

## Engineering workflow
- Make small, reviewable changes aligned to one task at a time.
- Add tests for critical scheduling, percentage calculations, aggregate eligibility, permissions, and injection-site logic.
- Run applicable formatting, lint, type-checking and tests before reporting a task complete; state what was and was not run.
- When changing schemas or configuration, update migration files, seed scripts and relevant documentation as needed.
- Keep comments and documentation concise. Record unresolved choices rather than silently deciding them.
