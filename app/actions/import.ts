"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { transactions, csvImports, categoryRules } from "@/db/schema";
import { parseCsv, type CsvFormat } from "@/lib/csv";
import { categorise } from "@/lib/categorise";
import { asc } from "drizzle-orm";

export type ImportPreview = {
  accountId: string;
  filename: string;
  format: CsvFormat;
  total: number;
  newCount: number;
  duplicateCount: number;
  uncategorisedCount: number;
  minDate: string | null;
  maxDate: string | null;
  detectedSortCode: string | null;
  errors: string[];
  sample: {
    date: string;
    description: string;
    amountPence: number;
    category: string;
    subcategory: string | null;
  }[];
};

export async function previewImport(
  accountId: string,
  filename: string,
  format: CsvFormat,
  content: string
): Promise<ImportPreview> {
  const parsed = parseCsv(content, format);
  const rules = await db
    .select()
    .from(categoryRules)
    .orderBy(asc(categoryRules.priority));

  const existing = await db
    .select({ externalId: transactions.externalId })
    .from(transactions);
  const existingIds = new Set(existing.map((e) => e.externalId));

  let duplicateCount = 0;
  let uncategorisedCount = 0;
  const seen = new Set<string>();
  const sample: ImportPreview["sample"] = [];

  for (const row of parsed.rows) {
    const dupKey = `${accountId}|${row.externalId}`;
    if (existingIds.has(row.externalId) || seen.has(dupKey)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(dupKey);
    const cat = categorise(row.description, row.amountPence, rules);
    if (cat.category === "Uncategorised") uncategorisedCount += 1;
    if (sample.length < 10) {
      sample.push({
        date: row.transactionDate,
        description: row.description,
        amountPence: row.amountPence,
        category: cat.category,
        subcategory: cat.subcategory,
      });
    }
  }

  const newCount = parsed.rows.length - duplicateCount;

  return {
    accountId,
    filename,
    format,
    total: parsed.rows.length,
    newCount,
    duplicateCount,
    uncategorisedCount,
    minDate: parsed.minDate,
    maxDate: parsed.maxDate,
    detectedSortCode: parsed.detectedSortCode,
    errors: parsed.errors,
    sample,
  };
}

export type ImportResult = {
  imported: number;
  duplicates: number;
  uncategorised: number;
  total: number;
};

export async function commitImport(
  accountId: string,
  filename: string,
  format: CsvFormat,
  content: string
): Promise<ImportResult> {
  const parsed = parseCsv(content, format);
  const rules = await db
    .select()
    .from(categoryRules)
    .orderBy(asc(categoryRules.priority));

  let imported = 0;
  let duplicates = 0;
  let uncategorised = 0;

  for (const row of parsed.rows) {
    const cat = categorise(row.description, row.amountPence, rules);
    if (cat.category === "Uncategorised") uncategorised += 1;
    const result = await db
      .insert(transactions)
      .values({
        accountId,
        externalId: row.externalId,
        transactionDate: row.transactionDate,
        description: row.description,
        amountPence: row.amountPence,
        category: cat.category,
        subcategory: cat.subcategory,
        isExcluded: cat.isExcluded,
        isManuallyCategorised: false,
      })
      .onConflictDoNothing({
        target: [transactions.accountId, transactions.externalId],
      })
      .returning({ id: transactions.id });
    if (result.length > 0) imported += 1;
    else duplicates += 1;
  }

  await db.insert(csvImports).values({
    accountId,
    filename,
    rowsTotal: parsed.rows.length,
    rowsImported: imported,
    rowsSkippedDuplicates: duplicates,
    rowsUncategorised: uncategorised,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/upload");

  return {
    imported,
    duplicates,
    uncategorised,
    total: parsed.rows.length,
  };
}
