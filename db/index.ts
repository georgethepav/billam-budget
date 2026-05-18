import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  db: Db | undefined;
};

// Lazy: the connection is created on first query, not at import time. A
// module-load throw would break the Next build's page-data collection.
function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Set it in .env.local (local) or the Vercel " +
        "project environment variables (production)."
    );
  }

  const client =
    globalForDb.client ?? postgres(connectionString, { max: 1, prepare: false });
  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
    globalForDb.db = instance;
  }
  return instance;
}

// Proxy keeps the `import { db } from "@/db"` call sites unchanged while
// deferring connection until a property (e.g. db.select, db.$client) is used.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    return Reflect.get(real as object, prop, receiver);
  },
});

export { schema };
