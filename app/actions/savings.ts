"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsTransfers, savingsGoals } from "@/db/schema";
import { isoDate } from "@/lib/dates";

export async function recordSavingsTransfer(input: {
  amountPence: number;
  transferDate?: string;
  notes?: string | null;
}) {
  await db.insert(savingsTransfers).values({
    amountPence: input.amountPence,
    transferDate: input.transferDate ?? isoDate(new Date()),
    notes: input.notes ?? null,
  });
  revalidatePath("/savings");
  revalidatePath("/");
}

export async function deleteSavingsTransfer(id: string) {
  await db.delete(savingsTransfers).where(eq(savingsTransfers.id, id));
  revalidatePath("/savings");
  revalidatePath("/");
}

export async function addSavingsGoal(input: {
  name: string;
  targetPence: number;
  priority: number;
  targetDate: string | null;
}) {
  await db.insert(savingsGoals).values({
    name: input.name,
    targetPence: input.targetPence,
    priority: input.priority,
    targetDate: input.targetDate,
  });
  revalidatePath("/savings");
  revalidatePath("/");
}

export async function updateSavingsGoal(
  id: string,
  patch: {
    name?: string;
    targetPence?: number;
    priority?: number;
    targetDate?: string | null;
    isActive?: boolean;
  }
) {
  await db.update(savingsGoals).set(patch).where(eq(savingsGoals.id, id));
  revalidatePath("/savings");
  revalidatePath("/");
}

export async function deleteSavingsGoal(id: string) {
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  revalidatePath("/savings");
  revalidatePath("/");
}
