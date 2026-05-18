import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { validatePasswordHash } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Public connectivity probe. Does not require login (allowlisted in proxy.ts)
// and never returns any data, only whether the database is reachable and
// whether the password hash is correctly formatted.
export async function GET() {
  const timestamp = new Date().toISOString();
  const pw = validatePasswordHash();
  const passwordHash = pw.ok ? "ok" : "invalid";

  let database: "connected" | "disconnected" = "disconnected";
  try {
    await db.execute(sql`select 1`);
    database = "connected";
  } catch {
    database = "disconnected";
  }

  const status =
    database === "connected" && passwordHash === "ok" ? "ok" : "error";

  return NextResponse.json(
    {
      status,
      database,
      passwordHash,
      ...(pw.ok ? {} : { passwordHashHint: pw.reason }),
      timestamp,
    },
    { status: 200 }
  );
}
