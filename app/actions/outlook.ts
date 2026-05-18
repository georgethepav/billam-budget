"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plannedPayments } from "@/db/schema";
import { setHolidayFundPence } from "@/lib/settings";

function revalidate() {
  revalidatePath("/outlook");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function addPlannedPayment(input: {
  name: string;
  amountPence: number;
  dueDate: string; // YYYY-MM-DD (first of the month)
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (!Number.isFinite(input.amountPence) || input.amountPence <= 0) {
    throw new Error("Amount must be a positive number");
  }
  const [row] = await db
    .insert(plannedPayments)
    .values({
      name,
      amountPence: Math.round(input.amountPence),
      dueDate: input.dueDate,
    })
    .returning({ id: plannedPayments.id });
  revalidate();
  return row.id;
}

export async function updatePlannedPayment(
  id: string,
  patch: { name?: string; amountPence?: number; dueDate?: string }
) {
  const set: Record<string, unknown> = {};
  if (patch.name != null) set.name = patch.name.trim();
  if (patch.amountPence != null) set.amountPence = Math.round(patch.amountPence);
  if (patch.dueDate != null) set.dueDate = patch.dueDate;
  if (Object.keys(set).length === 0) return;
  await db.update(plannedPayments).set(set).where(eq(plannedPayments.id, id));
  revalidate();
}

export async function deletePlannedPayment(id: string) {
  await db.delete(plannedPayments).where(eq(plannedPayments.id, id));
  revalidate();
}

export async function setHolidayFund(pence: number) {
  if (!Number.isFinite(pence) || pence < 0) {
    throw new Error("Fund must be zero or a positive number");
  }
  await setHolidayFundPence(pence);
  revalidate();
}
