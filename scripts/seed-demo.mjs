import postgres from "postgres";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seeding is disabled in production.");
}

if (process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Set ALLOW_DEMO_SEED=true to confirm development demo seeding.");
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed demo data.");
}

const client = postgres(databaseUrl, { max: 1 });

try {
  const inserted = await client`
    insert into app_health (id, created_at)
    overriding system value
    values (-2, now())
    on conflict (id) do nothing
    returning id
  `;

  console.log(inserted.length === 0 ? "Demo seed already applied." : "Demo seed applied.");
} finally {
  await client.end({ timeout: 5 });
}
