"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { budgetTargets, subscriptions } from "@/db/schema";
import { BUDGET_START } from "@/lib/dates";
import { revalidateHousehold } from "@/lib/cache";

export async function updateBudgetTarget(
  id: string,
  monthlyTargetPence: number,
  weeklyTargetPence: number | null
) {
  await db
    .update(budgetTargets)
    .set({ monthlyTargetPence, weeklyTargetPence })
    .where(eq(budgetTargets.id, id));
  revalidatePath("/budget");
  revalidateHousehold();
  revalidatePath("/");
}

// Updates only the monthly target (leaves any weekly target intact). Used by
// the Outlook what-if where only the monthly variable lever is adjusted.
export async function updateBudgetMonthly(
  id: string,
  monthlyTargetPence: number
) {
  await db
    .update(budgetTargets)
    .set({ monthlyTargetPence })
    .where(eq(budgetTargets.id, id));
  revalidatePath("/budget");
  revalidateHousehold();
  revalidatePath("/outlook");
  revalidatePath("/");
}

export async function addBudgetTarget(input: {
  category: string;
  monthlyTargetPence: number;
  weeklyTargetPence: number | null;
  type: string;
  expectedDayOfMonth: number | null;
}) {
  await db.insert(budgetTargets).values({
    category: input.category,
    monthlyTargetPence: input.monthlyTargetPence,
    weeklyTargetPence: input.weeklyTargetPence,
    type: input.type,
    expectedDayOfMonth: input.expectedDayOfMonth,
    activeFrom: BUDGET_START,
  });
  revalidatePath("/budget");
  revalidateHousehold();
}

export async function deleteBudgetTarget(id: string) {
  await db.delete(budgetTargets).where(eq(budgetTargets.id, id));
  revalidatePath("/budget");
  revalidateHousehold();
}

export async function updateSubscription(
  id: string,
  patch: { monthlyCostPence?: number; status?: string; notes?: string | null }
) {
  await db.update(subscriptions).set(patch).where(eq(subscriptions.id, id));
  revalidatePath("/budget");
  revalidateHousehold();
  revalidatePath("/insights");
}

export async function addSubscription(input: {
  name: string;
  monthlyCostPence: number;
  status: string;
  notes: string | null;
}) {
  await db.insert(subscriptions).values(input);
  revalidatePath("/budget");
  revalidateHousehold();
  revalidatePath("/insights");
}

export async function deleteSubscription(id: string) {
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  revalidatePath("/budget");
  revalidateHousehold();
  revalidatePath("/insights");
}
