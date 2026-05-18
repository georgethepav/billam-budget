"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { revalidateHousehold } from "@/lib/cache";

export async function addAccount(input: {
  accountName: string;
  accountType: string;
  csvFormat: string;
  sortCode: string | null;
  accountNumberLast4: string | null;
  isExcludedFromHouseholdTotals: boolean;
}) {
  await db.insert(bankAccounts).values(input);
  revalidatePath("/accounts");
  revalidateHousehold();
  revalidatePath("/upload");
}

export async function updateAccount(
  id: string,
  patch: Partial<{
    accountName: string;
    accountType: string;
    csvFormat: string;
    sortCode: string | null;
    accountNumberLast4: string | null;
    isExcludedFromHouseholdTotals: boolean;
  }>
) {
  await db.update(bankAccounts).set(patch).where(eq(bankAccounts.id, id));
  revalidatePath("/accounts");
  revalidateHousehold();
}

// Cascade-deletes the account's transactions via the FK constraint.
export async function deleteAccount(id: string) {
  await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
  revalidatePath("/accounts");
  revalidateHousehold();
  revalidatePath("/");
}
