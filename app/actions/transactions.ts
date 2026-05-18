"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categoryRules } from "@/db/schema";
import { categorise } from "@/lib/categorise";
import { revalidateHousehold } from "@/lib/cache";

export async function updateTransactionCategory(
  id: string,
  category: string,
  subcategory: string | null
) {
  await db
    .update(transactions)
    .set({ category, subcategory, isManuallyCategorised: true })
    .where(eq(transactions.id, id));
  revalidatePath("/transactions");
  revalidatePath("/");
  revalidateHousehold();
}

export async function toggleTransactionExcluded(id: string, excluded: boolean) {
  await db
    .update(transactions)
    .set({ isExcluded: excluded })
    .where(eq(transactions.id, id));
  revalidatePath("/transactions");
  revalidatePath("/");
  revalidateHousehold();
}

export async function updateTransactionNotes(id: string, notes: string) {
  await db
    .update(transactions)
    .set({ notes: notes.trim() || null })
    .where(eq(transactions.id, id));
  revalidatePath("/transactions");
  revalidateHousehold();
}

export async function createRuleFromTransaction(input: {
  pattern: string;
  category: string;
  subcategory: string | null;
  priority: number;
  applyToExisting: boolean;
}) {
  await db.insert(categoryRules).values({
    pattern: input.pattern.trim(),
    category: input.category,
    subcategory: input.subcategory,
    priority: input.priority,
  });

  if (input.applyToExisting) {
    const matches = await db
      .select({
        id: transactions.id,
        description: transactions.description,
      })
      .from(transactions)
      .where(eq(transactions.isManuallyCategorised, false));
    const pattern = input.pattern.trim().toUpperCase();
    for (const m of matches) {
      if (m.description.toUpperCase().includes(pattern)) {
        await db
          .update(transactions)
          .set({
            category: input.category,
            subcategory: input.subcategory,
          })
          .where(eq(transactions.id, m.id));
      }
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidateHousehold();
}

// Re-run categorisation over all non-manually-categorised transactions.
export async function recategoriseAll(): Promise<{ updated: number }> {
  const rules = await db
    .select()
    .from(categoryRules)
    .orderBy(asc(categoryRules.priority));
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.isManuallyCategorised, false));

  let updated = 0;
  for (const t of rows) {
    const cat = categorise(t.description, t.amountPence, rules);
    if (
      cat.category !== t.category ||
      cat.subcategory !== t.subcategory ||
      cat.isExcluded !== t.isExcluded
    ) {
      await db
        .update(transactions)
        .set({
          category: cat.category,
          subcategory: cat.subcategory,
          isExcluded: cat.isExcluded,
        })
        .where(
          and(
            eq(transactions.id, t.id),
            eq(transactions.isManuallyCategorised, false)
          )
        );
      updated += 1;
    }
  }
  revalidatePath("/transactions");
  revalidatePath("/");
  revalidateHousehold();
  return { updated };
}
