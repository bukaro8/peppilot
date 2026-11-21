import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function createConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
  }

  const client = postgres(databaseUrl, {
    connect_timeout: 5,
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });

  return {
    client,
    database: drizzle(client, { schema }),
  };
}

type DatabaseConnection = ReturnType<typeof createConnection>;

const globalForDatabase = globalThis as unknown as {
  databaseConnection?: DatabaseConnection;
};

let connection = globalForDatabase.databaseConnection;

function getConnection() {
  connection ??= createConnection();

  if (process.env.NODE_ENV !== "production") {
    globalForDatabase.databaseConnection = connection;
  }

  return connection;
}

export function getDatabase() {
  return getConnection().database;
}

export function getPostgresClient() {
  return getConnection().client;
}
