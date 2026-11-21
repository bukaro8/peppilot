# Database migrations and seeds

Generate migrations only during development after changing `lib/db/schema.ts`:

```sh
npm run db:generate
```

Apply committed migrations with `npm run db:migrate`. The command takes a PostgreSQL advisory lock, so concurrent deployments wait rather than migrating together. Drizzle records completed migrations and safely skips them on later runs. A migration error exits non-zero.

The production Compose stack runs this command in its one-shot `migrate` service. A second one-shot `seed` service runs only after migration success, and the application runs only after both services complete successfully. Deployment never generates migration files.

`npm run db:seed` inserts the reserved `app_health` placeholder and the 16-entry peptide catalogue with approved blend ingredient links. It uses stable identifiers and conflict-safe inserts, so it can be rerun without duplicates or overwriting managed rows.

Production runs this approved reference seed automatically. The production migrator image does not contain `seed-demo.mjs`; synthetic/demo seeding is never part of the deployment chain.

Demo seeding is separate and requires both a non-production environment and explicit confirmation:

```sh
ALLOW_DEMO_SEED=true npm run db:seed:demo
```

The current demo seed is only a reserved `app_health` placeholder. It contains no users or product data.
