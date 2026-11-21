# PepPilot — Section 01: Project Foundation

**Purpose:** Prepare a working, testable application foundation before building user-facing features.

**Product context:** `docs/PROJECT_CONTEXT.md`  
**Coding instructions:** `AGENTS.md`  
**Initial hostname:** `track.weightpilot.uk`  
**Environments:** Local development in Docker; production deployment through Coolify using Docker, with separate databases and secrets.

## How Codex should work

Complete one task at a time in order. Keep changes small. After each task, run the relevant checks and report the result, changed files, and any unresolved issue. Do not build authentication, protocol templates, calendar logic, community features or injection tracking in this section. Use supported, compatible package versions and record what you install; avoid arbitrary upgrades.

## F01 — Initialise the web app and design foundation

**Implement**
- Create a Next.js application with TypeScript and App Router.
- Configure Tailwind CSS, shadcn/ui and a simple responsive layout.
- Add a homepage shell with the **PepPilot** name and placeholder navigation, without implementing later sections.
- Prepare basic mobile-friendly styling and accessible UI defaults.

**Acceptance criteria**
- App starts locally and displays a responsive PepPilot shell.
- TypeScript, linting and production build succeed.
- No treatment/protocol functionality is mocked as though it works.

## F02 — Configure PostgreSQL and Drizzle

**Implement**
- Add Drizzle ORM, the PostgreSQL driver, configuration and a database connection module.
- Add a minimal baseline migration (a small infrastructure/health table only if needed); defer feature tables to their respective sections.
- Set up development-only database tooling and document the migration commands.

**Acceptance criteria**
- The application connects to local PostgreSQL.
- The initial migration runs successfully against an empty database and can be safely rerun without duplicating objects.
- No user credentials are committed.

## F03 — Docker-based local development

**Implement**
- Add Docker configuration for a local application and PostgreSQL instance.
- Enable a practical development workflow with code changes reflected locally.
- Persist PostgreSQL data using a named volume.
- Add `.env.example` showing required variables with safe placeholders; exclude `.env` from Git.

**Acceptance criteria**
- One documented Docker Compose command starts the development app and database.
- The app can reach the database from inside Docker.
- Restarting containers preserves database data.

## F04 — Production container and Coolify readiness

**Implement**
- Create a multi-stage production Dockerfile using a compatible Node.js runtime.
- Provide production-oriented Compose configuration or documented Coolify-compatible settings without embedding credentials.
- Add an application health endpoint and container health check.
- Describe domain, environment variables, database persistence and reverse-proxy expectations for `track.weightpilot.uk`.

**Acceptance criteria**
- Production image builds and runs locally.
- Health check reports a healthy running app and an unhealthy app on failure.
- Production configuration does not share development credentials or database volumes.
- No actual production deployment is performed as part of this task.

## F05 — Safe migration and seed workflow

**Implement**
- Add scripts to **apply committed, versioned** Drizzle migrations before the updated application starts in production; do not generate migrations during deployment.
- Ensure a migration failure stops the rollout, and guard against concurrent migration execution.
- Add a repeatable reference-data seed entry point (it may be empty until the catalogue is defined in Section 03).
- Add a **separate, explicitly gated** demo-seed entry point for the 20 synthetic users planned later; it must refuse to run in production.

**Acceptance criteria**
- Pending migrations apply once and re-running the migration command is safe.
- A deliberately failing migration prevents the new app from starting.
- Seed commands are documented and do not create demo accounts in production.
- Deployment does not automatically generate schema changes.

## F06 — Quality checks and developer README

**Implement**
- Configure basic formatting, lint, type-check and test commands.
- Add one small automated smoke test (for example, the health endpoint).
- Write a concise `README.md` covering local start, environment setup, migrations, seeding, tests and production build.

**Acceptance criteria**
- Documented checks can be run locally and succeed.
- A new developer can bring up the app without guessing commands or secrets.
- The final Codex report lists the files changed, commands run and any limitations.

## Section complete when

- Local Docker development works with persistent PostgreSQL.
- A production Docker image can build and pass health checks.
- Versioned migrations have a safe execution path and demo seeding is protected.
- The app has a minimal responsive shell, and basic quality checks are green.

**Out of scope:** account sign-in, catalogue content, protocol templates, notifications, personal measurements, body map, community analytics and deploying to the live domain.
