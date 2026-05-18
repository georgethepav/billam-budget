import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { db } from "@/db";
import { transactions, bankAccounts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const rows = await db
    .select({
      date: transactions.transactionDate,
      description: transactions.description,
      amountPence: transactions.amountPence,
      category: transactions.category,
      subcategory: transactions.subcategory,
      excluded: transactions.isExcluded,
      notes: transactions.notes,
      account: bankAccounts.accountName,
    })
    .from(transactions)
    .innerJoin(bankAccounts, eq(transactions.accountId, bankAccounts.id))
    .orderBy(asc(transactions.transactionDate));

  const header = [
    "Date",
    "Description",
    "Amount (GBP)",
    "Category",
    "Subcategory",
    "Excluded",
    "Notes",
    "Account",
  ].join(",");

  const body = rows
    .map((r) =>
      [
        r.date,
        csvCell(r.description),
        (r.amountPence / 100).toFixed(2),
        csvCell(r.category),
        csvCell(r.subcategory),
        r.excluded ? "yes" : "no",
        csvCell(r.notes),
        csvCell(r.account),
      ].join(",")
    )
    .join("\n");

  const filename = `billam-budget-export-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(`${header}\n${body}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
