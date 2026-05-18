"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, csvImports, categoryRules } from "@/db/schema";
import { parseCsv, type CsvFormat, type ParseResult, type ParsedRow } from "@/lib/csv";
import { parsePdfStatement } from "@/lib/pdf";
import { categorise } from "@/lib/categorise";
import { revalidateHousehold } from "@/lib/cache";

export type ImportKind = "csv" | "pdf";

// content is the CSV text, or (for pdf) the base64-encoded PDF bytes.
async function parseContent(
  kind: ImportKind,
  format: CsvFormat,
  content: string
): Promise<ParseResult> {
  try {
    if (kind === "pdf") {
      const bytes = new Uint8Array(Buffer.from(content, "base64"));
      return await parsePdfStatement(bytes);
    }
    return parseCsv(content, format);
  } catch (e) {
    return {
      rows: [],
      detectedSortCode: null,
      minDate: null,
      maxDate: null,
      errors: [
        `Failed to read the ${kind.toUpperCase()}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      ],
    };
  }
}

type ExistingRow = {
  externalId: string;
  transactionDate: string;
  amountPence: number;
};

// Split parsed rows into new vs duplicate. A row is a duplicate if its exact
// externalId already exists, OR (fuzzy, for CSV<->PDF overlap) an existing
// transaction shares the same date and amount even when the description text
// differs. Matching is greedy 1:1 so two genuine same-day same-amount
// transactions aren't both swallowed when only one already exists.
function dedupe(rows: ParsedRow[], existing: ExistingRow[]) {
  const existingIds = new Set(existing.map((e) => e.externalId));
  const dateAmt = new Map<string, number>();
  for (const e of existing) {
    const k = `${e.transactionDate}|${e.amountPence}`;
    dateAmt.set(k, (dateAmt.get(k) ?? 0) + 1);
  }
  const seenIds = new Set<string>();
  const newRows: ParsedRow[] = [];
  let duplicateCount = 0;

  for (const row of rows) {
    if (existingIds.has(row.externalId) || seenIds.has(row.externalId)) {
      duplicateCount += 1;
      continue;
    }
    const k = `${row.transactionDate}|${row.amountPence}`;
    const avail = dateAmt.get(k) ?? 0;
    if (avail > 0) {
      dateAmt.set(k, avail - 1);
      duplicateCount += 1;
      continue;
    }
    seenIds.add(row.externalId);
    newRows.push(row);
  }
  return { newRows, duplicateCount };
}

async function existingForAccount(accountId: string): Promise<ExistingRow[]> {
  return db
    .select({
      externalId: transactions.externalId,
      transactionDate: transactions.transactionDate,
      amountPence: transactions.amountPence,
    })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));
}

export type ImportPreview = {
  accountId: string;
  filename: string;
  format: CsvFormat;
  kind: ImportKind;
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
  content: string,
  kind: ImportKind = "csv"
): Promise<ImportPreview> {
  const parsed = await parseContent(kind, format, content);
  const rules = await db
    .select()
    .from(categoryRules)
    .orderBy(asc(categoryRules.priority));

  const existing = await existingForAccount(accountId);
  const { newRows, duplicateCount } = dedupe(parsed.rows, existing);

  let uncategorisedCount = 0;
  const sample: ImportPreview["sample"] = [];
  for (const row of newRows) {
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

  return {
    accountId,
    filename,
    format,
    kind,
    total: parsed.rows.length,
    newCount: newRows.length,
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
  content: string,
  kind: ImportKind = "csv"
): Promise<ImportResult> {
  const parsed = await parseContent(kind, format, content);
  const rules = await db
    .select()
    .from(categoryRules)
    .orderBy(asc(categoryRules.priority));

  const existing = await existingForAccount(accountId);
  const { newRows, duplicateCount } = dedupe(parsed.rows, existing);

  let imported = 0;
  let duplicates = duplicateCount;
  let uncategorised = 0;

  for (const row of newRows) {
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
  revalidateHousehold();

  return {
    imported,
    duplicates,
    uncategorised,
    total: parsed.rows.length,
  };
}
