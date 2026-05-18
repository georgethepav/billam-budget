// Applies pending migrations using the postgres-js connection settings that
// work against Neon's pooler (drizzle-kit migrate hangs on it). The migration
// journal is consistent (see repair-and-migrate.ts), so this just applies any
// new migration files. Idempotent.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
