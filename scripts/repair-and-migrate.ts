// One-off repair: the database was originally created with `drizzle-kit push`,
// so migration 0000 (the initial schema) was never recorded in
// drizzle.__drizzle_migrations. That makes a normal `migrate` try to re-run
// 0000 and fail because every table already exists - which is why
// `drizzle-kit migrate` hung/failed.
//
// Fix: mark 0000 as already applied (record only, do NOT run its SQL), then
// run the official migrator, which will skip 0000 and apply 0001 cleanly and
// record it. Idempotent: safe to re-run.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";

function hashOf(tag: string): number | string {
  const content = readFileSync(`drizzle/${tag}.sql`).toString();
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  // Same DDL the migrator would create, so we can pre-seed the 0000 record.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`
  );

  const existing = await db.execute(
    sql`select count(*)::int as n from "drizzle"."__drizzle_migrations"`
  );
  const count = Number((existing as unknown as { n: number }[])[0]?.n ?? 0);

  if (count === 0) {
    // _journal.json: 0000_true_chimera when=1779111310078
    const hash0000 = hashOf("0000_true_chimera");
    await db.execute(
      sql`insert into "drizzle"."__drizzle_migrations" ("hash", "created_at")
          values (${hash0000}, ${1779111310078})`
    );
    console.log("Recorded 0000_true_chimera as already applied (no SQL run).");
  } else {
    console.log(`__drizzle_migrations already has ${count} row(s); skipping seed.`);
  }

  // Now the migrator sees 0000 as applied and only applies 0001.
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");

  const rows = await db.execute(
    sql`select to_regclass('public.app_settings') as t`
  );
  console.log(
    "app_settings table:",
    (rows as unknown as { t: string | null }[])[0]?.t ?? "MISSING"
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
