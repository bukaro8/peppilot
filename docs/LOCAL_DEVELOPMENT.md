# Local Docker development

Copy the example environment once, then start the Next.js and PostgreSQL containers:

```sh
cp .env.example .env
docker compose up --build
```

The app is available at `http://localhost:3000`. Source files are bind-mounted and Next.js watches them for changes. PostgreSQL is exposed on `localhost:5432`; its data is stored in the named `peppilot_postgres_data` volume. Passwordless sign-in emails are captured locally at `http://localhost:8025` and are not sent externally.

Apply the committed Drizzle migrations after the containers are healthy:

```sh
docker compose exec app npm run db:migrate
```

Seed the app-health placeholder and 16-entry catalogue safely at any time:

```sh
docker compose exec app npm run db:seed
```

The separate demo placeholder requires explicit confirmation and is blocked when `NODE_ENV=production`:

```sh
docker compose exec -e ALLOW_DEMO_SEED=true app npm run db:seed:demo
```

Stop the environment without deleting database data:

```sh
docker compose down
```

Run `docker compose down --volumes` only when intentionally resetting all local Docker data and dependency caches.
