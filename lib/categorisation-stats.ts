import "server-only";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categoryRules } from "@/db/schema";

export type Totals = {
  total: number;
  categorised: number;
  uncategorised: number;
  manual: number;
  excluded: number;
  dateMin: string | null;
  dateMax: string | null;
};

export async function getTotals(): Promise<Totals> {
  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      uncategorised: sql<number>`count(*) filter (where coalesce(${transactions.category}, 'Uncategorised') = 'Uncategorised')`,
      categorised: sql<number>`count(*) filter (where coalesce(${transactions.category}, 'Uncategorised') != 'Uncategorised')`,
      manual: sql<number>`count(*) filter (where ${transactions.isManuallyCategorised})`,
      excluded: sql<number>`count(*) filter (where ${transactions.isExcluded})`,
      dateMin: sql<string | null>`min(${transactions.transactionDate})::text`,
      dateMax: sql<string | null>`max(${transactions.transactionDate})::text`,
    })
    .from(transactions);
  const r = rows[0];
  return {
    total: Number(r.total),
    categorised: Number(r.categorised),
    uncategorised: Number(r.uncategorised),
    manual: Number(r.manual),
    excluded: Number(r.excluded),
    dateMin: r.dateMin,
    dateMax: r.dateMax,
  };
}

export type CategoryRow = {
  category: string;
  count: number;
  debitPence: number;
  creditPence: number;
};

export async function getByCategory(): Promise<CategoryRow[]> {
  const rows = await db
    .select({
      category: sql<string>`coalesce(${transactions.category}, 'Uncategorised')`,
      count: sql<number>`count(*)`,
      debit: sql<number>`coalesce(sum(case when ${transactions.amountPence} < 0 then -${transactions.amountPence} else 0 end), 0)`,
      credit: sql<number>`coalesce(sum(case when ${transactions.amountPence} > 0 then ${transactions.amountPence} else 0 end), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.isExcluded, false))
    .groupBy(sql`1`)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({
    category: r.category,
    count: Number(r.count),
    debitPence: Number(r.debit),
    creditPence: Number(r.credit),
  }));
}

export type TopUncategorised = {
  id: string;
  date: string;
  description: string;
  amountPence: number;
};

export async function getTopUncategorised(limit = 20): Promise<TopUncategorised[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.transactionDate,
      description: transactions.description,
      amountPence: transactions.amountPence,
    })
    .from(transactions)
    .where(
      and(
        or(
          eq(transactions.category, "Uncategorised"),
          isNull(transactions.category)
        )!,
        eq(transactions.isExcluded, false)
      )
    )
    .orderBy(sql`abs(${transactions.amountPence}) desc`)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    description: r.description,
    amountPence: r.amountPence,
  }));
}

export type RepeatedMerchant = {
  prefix: string;
  count: number;
  totalPence: number;
};

export async function getRepeatedUncategorised(
  limit = 20
): Promise<RepeatedMerchant[]> {
  const rows = await db
    .select({
      prefix: sql<string>`upper(substring(${transactions.description} from 1 for 24))`,
      count: sql<number>`count(*)`,
      total: sql<number>`sum(abs(${transactions.amountPence}))`,
    })
    .from(transactions)
    .where(
      and(
        or(
          eq(transactions.category, "Uncategorised"),
          isNull(transactions.category)
        )!,
        eq(transactions.isExcluded, false)
      )
    )
    .groupBy(sql`1`)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`count(*) desc, sum(abs(${transactions.amountPence})) desc`)
    .limit(limit);
  return rows.map((r) => ({
    prefix: r.prefix,
    count: Number(r.count),
    totalPence: Number(r.total),
  }));
}

export type DeadRule = {
  pattern: string;
  category: string;
  subcategory: string | null;
  priority: number;
};

export async function getDeadRules(): Promise<DeadRule[]> {
  const rules = await db
    .select()
    .from(categoryRules)
    .orderBy(asc(categoryRules.priority), asc(categoryRules.category));

  const dead: DeadRule[] = [];
  // For each rule, check if any transaction description contains the pattern.
  // Multi-part patterns ("A + B") require both substrings.
  for (const r of rules) {
    const parts = r.pattern.split(" + ").map((p) => p.trim());
    const whereClauses = parts.map(
      (p) =>
        sql`upper(${transactions.description}) like ${"%" + p.toUpperCase() + "%"}`
    );
    const [row] = await db
      .select({ exists: sql<number>`count(*)` })
      .from(transactions)
      .where(sql`${sql.join(whereClauses, sql` and `)}`)
      .limit(1);
    if (Number(row?.exists ?? 0) === 0) {
      dead.push({
        pattern: r.pattern,
        category: r.category,
        subcategory: r.subcategory,
        priority: r.priority,
      });
    }
  }
  return dead;
}

export type SubBreakdown = {
  category: string;
  subcategory: string;
  count: number;
  debitPence: number;
};

export async function getSubcategoryBreakdown(
  limit = 30
): Promise<SubBreakdown[]> {
  const rows = await db
    .select({
      category: sql<string>`coalesce(${transactions.category}, 'Uncategorised')`,
      subcategory: sql<string>`coalesce(${transactions.subcategory}, '-')`,
      count: sql<number>`count(*)`,
      debit: sql<number>`coalesce(sum(case when ${transactions.amountPence} < 0 then -${transactions.amountPence} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.isExcluded, false),
        sql`${transactions.amountPence} < 0`
      )
    )
    .groupBy(sql`1, 2`)
    .orderBy(sql`4 desc`)
    .limit(limit);
  return rows.map((r) => ({
    category: r.category,
    subcategory: r.subcategory,
    count: Number(r.count),
    debitPence: Number(r.debit),
  }));
}

export async function getAllStats() {
  const [totals, byCategory, topUncat, repeated, deadRules, subs] =
    await Promise.all([
      getTotals(),
      getByCategory(),
      getTopUncategorised(20),
      getRepeatedUncategorised(20),
      getDeadRules(),
      getSubcategoryBreakdown(30),
    ]);
  return { totals, byCategory, topUncat, repeated, deadRules, subs };
}
