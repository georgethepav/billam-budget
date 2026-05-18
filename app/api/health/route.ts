import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

// Public connectivity probe. Does not require login (allowlisted in proxy.ts)
// and never returns any data, only whether the database is reachable.
export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        timestamp,
      },
      { status: 200 }
    );
  }
}
