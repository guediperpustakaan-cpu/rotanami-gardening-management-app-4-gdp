import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL belum disetel. Salin .env.example menjadi .env lalu isi connection string database Anda.",
  );
}

export type Database = NodePgDatabase<typeof schema>;

/**
 * Neon mendukung dua cara koneksi:
 * 1. driver HTTP serverless `@neondatabase/serverless` (cocok untuk edge/serverless, tanpa pool TCP),
 * 2. koneksi TCP standar (node-postgres) untuk server yang hidup lama.
 *
 * Rotanami memilih driver HTTP Neon bila connection string mengarah ke Neon
 * atau DATABASE_DRIVER=neon, dan memakai node-postgres untuk PostgreSQL biasa.
 */
function isNeonUrl(url: string) {
  return process.env.DATABASE_DRIVER === "neon" || /\.neon\.tech/i.test(url);
}

function isLocalUrl(url: string) {
  return /@localhost|@127\.0\.0\.1|@host\.docker\.internal/i.test(url);
}

const globalForDb = globalThis as typeof globalThis & {
  __rotanamiDb?: Database;
  __rotanamiPool?: Pool;
};

function createDb(): { db: Database; kind: "neon-http" | "node-postgres" } {
  if (isNeonUrl(databaseUrl!)) {
    const client = neon(databaseUrl!);
    return { db: drizzleNeon(client, { schema }) as unknown as Database, kind: "neon-http" };
  }

  const pool =
    globalForDb.__rotanamiPool ??
    new Pool({
      connectionString: databaseUrl,
      // Neon & kebanyakan cloud Postgres mewajibkan TLS; PostgreSQL lokal tidak.
      ssl: isLocalUrl(databaseUrl!) ? undefined : { rejectUnauthorized: false },
      max: 5,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__rotanamiPool = pool;
  }

  return { db: drizzleNodePg(pool, { schema }), kind: "node-postgres" };
}

const created = globalForDb.__rotanamiDb ? { db: globalForDb.__rotanamiDb, kind: "node-postgres" as const } : createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__rotanamiDb = created.db;
}

export const db: Database = created.db;
export const dbDriver = created.kind;
export * from "./schema";
