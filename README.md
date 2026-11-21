# PepPilot

PepPilot is a responsive Next.js application and future installable PWA for peptide tracking. It includes passwordless authentication, public profiles, the approved peptide catalogue, versioned protocol templates, private custom protocols, independent cycles, injection tracking, calendars, and a private health journal with cycle goals and baseline snapshots.

## Prerequisites

- Node.js 22+
- Docker Desktop with Docker Compose

## Local development

```sh
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000`, view local sign-in emails at `http://localhost:8025`, then apply the committed database migrations from another terminal:

```sh
docker compose exec app npm run db:migrate
```

Stop the containers without deleting PostgreSQL data with `docker compose down`. See [Local Docker development](docs/LOCAL_DEVELOPMENT.md) for migration and seed commands.

## Environment

`.env.example` documents local variables. `.env.production.example` documents the separate production values expected by Coolify. Copy an example to an ignored environment file and replace placeholders; never commit credentials.

The application requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and SMTP settings. Docker Compose derives container networking from the `database` and `mailpit` services, while host-run commands use `localhost`. Demo seeding additionally requires `ALLOW_DEMO_SEED=true` and is blocked in production.

## Checks

Install host dependencies with `npm ci`, then run:

| Command | Purpose |
| --- | --- |
| `npm test` | Run unit tests once |
| `npm run test:integration` | Run integration tests against migrated PostgreSQL |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run build` | Create the standalone production build |
| `npm run db:generate` | Generate a migration during development |
| `npm run db:migrate` | Apply committed migrations safely |
| `npm run db:seed` | Apply repeatable initial seed data |
| `npm run db:seed:demo` | Apply explicitly enabled development-only demo data |

Unit tests do not require PostgreSQL. Integration tests cover authentication, profiles, catalogue queries, template versioning, private protocols, cycle history, injection logging/corrections/history, health-journal permissions and baselines, and calendar projections. Authentication tests use an in-memory email capture and never send or print sign-in tokens. Injection schema and status semantics are documented in [Protocol workflows](docs/PROTOCOLS.md); journal metrics and baseline rules are documented in [Health journal](docs/HEALTH_JOURNAL.md).

## Deployment

- [Database migrations and seeding](docs/DATABASE_WORKFLOWS.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Catalogue and protocol workflows](docs/PROTOCOLS.md)
- [Health journal](docs/HEALTH_JOURNAL.md)
- [Coolify production deployment](docs/COOLIFY_DEPLOYMENT.md)
- [Confirmed product decisions](docs/PROJECT_CONTEXT.md)

Production uses `Dockerfile` and `compose.production.yaml`. Do not use the development Compose stack or credentials in production.
