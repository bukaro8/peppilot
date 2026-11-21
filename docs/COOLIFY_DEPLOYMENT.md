# Coolify deployment

PepPilot deploys from `compose.production.yaml`. Coolify builds the multi-stage `Dockerfile`; PostgreSQL is reachable only on the private Compose network and stores data in the persistent `peppilot_production_postgres_data` volume.

## Environment variables

Configure these in the Coolify resource before the first deployment. Mark the four secret values as **Secret** so Coolify masks them in its UI and logs.

| Variable | Value | Classification |
| --- | --- | --- |
| `POSTGRES_DB` | `peppilot` | Configuration |
| `POSTGRES_USER` | `peppilot` | Configuration |
| `POSTGRES_PASSWORD` | A unique high-entropy database password | **Secret** |
| `DATABASE_URL` | `postgresql://peppilot:<URL-encoded password>@database:5432/peppilot` | **Secret** |
| `BETTER_AUTH_SECRET` | A unique random value of at least 32 characters | **Secret** |
| `BETTER_AUTH_URL` | `https://protocols.weightpilot.uk` | Configuration |
| `EMAIL_FROM` | `PepPilot <noreply@weightpilot.uk>` | Configuration |
| `SMTP_HOST` | `smtp.resend.com` | Configuration |
| `SMTP_PORT` | `465` | Configuration |
| `SMTP_SECURE` | `true` | Configuration |
| `SMTP_USER` | `resend` | Configuration |
| `SMTP_PASSWORD` | A Resend API key permitted to send from `weightpilot.uk` | **Secret** |

`SMTP_PASSWORD` is the Resend API key; PepPilot does not use a separate `RESEND_API_KEY` variable. Keep the database password identical in `POSTGRES_PASSWORD` and the URL-encoded password portion of `DATABASE_URL`.

## Initial deployment

1. In Resend, verify `weightpilot.uk`, create a sending API key, and confirm `noreply@weightpilot.uk` is permitted as a sender.
2. In Coolify, create a Docker Compose resource from this repository and select `compose.production.yaml`.
3. Add the environment variables above. Do not paste secrets into build arguments, the repository, or deployment notes.
4. Assign `https://protocols.weightpilot.uk` to the `app` service on container port `3000`. Preserve the existing `track.weightpilot.uk` application and its configuration. Ensure the public request reaches Coolify as HTTPS.
5. Confirm the PostgreSQL service has the persistent `peppilot_production_postgres_data` volume and no published host port.
6. Take a database backup if this resource already contains data, then deploy.

Deployment order is enforced by Compose:

1. `database` becomes healthy.
2. `migrate` applies committed Drizzle migrations under a PostgreSQL advisory lock.
3. `seed` idempotently inserts only approved catalogue/reference data.
4. `app` starts only after both one-shot services exit successfully.

A migration or seed failure prevents the application from starting. Demo seeding is not copied into the production migrator image, is never invoked by production Compose, and remains blocked by `NODE_ENV=production` in local source.

## Verification

After deployment:

1. Confirm `database` and `app` are healthy and `migrate` and `seed` exited with status `0`.
2. Open `https://protocols.weightpilot.uk/api/health`; it must return `{"status":"ok"}`.
3. Request a magic link to a controlled address. Confirm the email sender is `PepPilot <noreply@weightpilot.uk>` and the link origin is exactly `https://protocols.weightpilot.uk`.
4. Complete sign-in and confirm the session cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`.
5. Confirm PostgreSQL has no host/public port and that application logs contain no SMTP credentials, cookies, tokens, or magic-link URLs.

## Backup and rollback

Enable scheduled Coolify backups for `peppilot_production_postgres_data`. Before each application upgrade, also take an on-demand PostgreSQL custom-format backup from the resource terminal:

```sh
docker compose -f compose.production.yaml exec -T database \
  pg_dump -U peppilot -d peppilot -Fc > peppilot-before-deploy.dump
```

For an application-only rollback, select the previously working commit/image in Coolify and redeploy it. Migrations are forward-only: do not manually edit Drizzle's migration table or reverse a migration in place. If the old application is incompatible with the migrated schema, stop writes and restore the pre-deploy backup into a clean database/volume, verify it, then point the application at that restored database.

## Local production-stack validation

Copy `.env.production.example` to the ignored `.env.production.local`, replace every secret placeholder with a dummy local value, and do not submit the sign-in form. A temporary Compose project name keeps its database volume separate from development and production:

```sh
cp .env.production.example .env.production.local

docker compose --env-file .env.production.local -p peppilot-prod-validation \
  -f compose.production.yaml up --build --detach
docker compose --env-file .env.production.local -p peppilot-prod-validation \
  -f compose.production.yaml ps --all
docker compose --env-file .env.production.local -p peppilot-prod-validation \
  -f compose.production.yaml \
  exec -T app wget -qO- http://127.0.0.1:3000/api/health

docker compose --env-file .env.production.local -p peppilot-prod-validation \
  -f compose.production.yaml down --volumes
```

The final command removes only the isolated validation project and its temporary volume. It does not affect the normal local-development or Coolify volumes.
