import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

// Key/value settings. Reads tolerate the table not existing yet (migration
// not applied) so the app keeps working - callers fall back to a default.

export async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: sql`now()` },
    });
}

const INCOME_KEY = "projected_monthly_income_pence";

export async function getIncomeOverridePence(): Promise<number | null> {
  const raw = await getSetting(INCOME_KEY);
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function setIncomeOverridePence(
  pence: number | null
): Promise<void> {
  // Empty string clears the override (back to the historical average).
  await setSetting(INCOME_KEY, pence == null ? "" : String(Math.round(pence)));
}

const HOLIDAY_FUND_KEY = "holiday_2026_fund_pence";
export const DEFAULT_HOLIDAY_FUND_PENCE = 200000; // £2,000

export async function getHolidayFundPence(): Promise<number> {
  const raw = await getSetting(HOLIDAY_FUND_KEY);
  if (raw == null || raw.trim() === "") return DEFAULT_HOLIDAY_FUND_PENCE;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : DEFAULT_HOLIDAY_FUND_PENCE;
}

export async function setHolidayFundPence(pence: number): Promise<void> {
  await setSetting(HOLIDAY_FUND_KEY, String(Math.max(0, Math.round(pence))));
}
