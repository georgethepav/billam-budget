"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  transactions,
  csvImports,
  savingsTransfers,
  savingsGoals,
  subscriptions,
  budgetTargets,
  categoryRules,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { destroySession } from "@/lib/session";

// We cannot rewrite Vercel env vars at runtime, so changing the password
// returns the new hash for the user to set as SITE_PASSWORD_HASH. The current
// session is destroyed immediately as a safety measure.
export async function changePassword(
  newPassword: string
): Promise<{ hash: string }> {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const hash = await hashPassword(newPassword);
  await destroySession();
  return { hash };
}

export async function deleteAllTransactions(confirm: string) {
  if (confirm !== "DELETE TRANSACTIONS") {
    throw new Error("Confirmation text did not match");
  }
  await db.delete(transactions);
  await db.delete(csvImports);
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteAllData(confirm: string) {
  if (confirm !== "DELETE ALL DATA") {
    throw new Error("Confirmation text did not match");
  }
  await db.delete(transactions);
  await db.delete(csvImports);
  await db.delete(savingsTransfers);
  await db.delete(savingsGoals);
  await db.delete(subscriptions);
  await db.delete(budgetTargets);
  await db.delete(categoryRules);
  revalidatePath("/");
}
