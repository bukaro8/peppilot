import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply migrations.");
}

const migrationLockId = 73_377_105;
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const client = postgres(databaseUrl, { max: 1 });
let lockAcquired = false;

try {
  await client`select pg_advisory_lock(${migrationLockId}::bigint)`;
  lockAcquired = true;

  await migrate(drizzle(client), { migrationsFolder });
  console.log("Database migrations completed successfully.");
} catch (error) {
  console.error("Database migration failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (lockAcquired) {
    await client`select pg_advisory_unlock(${migrationLockId}::bigint)`;
  }

  await client.end({ timeout: 5 });
}
