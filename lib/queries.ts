import "server-only";
import { and, asc, desc, eq, gte, lte, sql, ilike, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  bankAccounts,
  transactions,
  budgetTargets,
  savingsGoals,
  savingsTransfers,
  subscriptions,
  categoryRules,
  csvImports,
  plannedPayments,
} from "@/db/schema";
import {
  weekRange,
  lastWeekRange,
  monthRange,
  projectMonthEnd,
  isoDate,
  monthsUntilGoal,
  OUTLOOK_GOAL_DATE,
} from "./dates";
import { getIncomeOverridePence } from "./settings";
import { computeOutlook } from "./outlook";

export const VARIABLE_CATEGORIES = [
  "Groceries",
  "Eating Out",
  "Kids",
  "Shopping",
  "Fuel",
  "Transport",
  "Personal",
] as const;

export async function getAccounts() {
  return db.select().from(bankAccounts).orderBy(asc(bankAccounts.accountName));
}

export async function getAccountStats() {
  const accounts = await getAccounts();
  const counts = await db
    .select({
      accountId: transactions.accountId,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .groupBy(transactions.accountId);
  const lastImports = await db
    .select({
      accountId: csvImports.accountId,
      last: sql<string>`max(${csvImports.importedAt})`,
    })
    .from(csvImports)
    .groupBy(csvImports.accountId);

  const countMap = new Map(counts.map((c) => [c.accountId, Number(c.count)]));
  const lastMap = new Map(lastImports.map((l) => [l.accountId, l.last]));

  return accounts.map((a) => ({
    ...a,
    transactionCount: countMap.get(a.id) ?? 0,
    lastImport: lastMap.get(a.id) ?? null,
  }));
}

export async function getRules() {
  return db.select().from(categoryRules).orderBy(asc(categoryRules.priority));
}

// Net position per account (sum of imported transactions). With full history
// imported this approximates the running balance.
async function accountNets() {
  const rows = await db
    .select({
      accountId: transactions.accountId,
      net: sql<number>`coalesce(sum(${transactions.amountPence}), 0)`,
    })
    .from(transactions)
    .groupBy(transactions.accountId);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.accountId, Number(r.net));
  return map;
}

export async function getHouseholdPosition() {
  const accounts = await getAccounts();
  const nets = await accountNets();
  const transfers = await db
    .select({
      total: sql<number>`coalesce(sum(${savingsTransfers.amountPence}), 0)`,
    })
    .from(savingsTransfers);
  const manualSavings = Number(transfers[0]?.total ?? 0);

  let currentBalance = 0;
  let savingsBalance = manualSavings;
  for (const a of accounts) {
    if (a.isExcludedFromHouseholdTotals) continue;
    const net = nets.get(a.id) ?? 0;
    if (a.accountType === "savings") savingsBalance += net;
    else currentBalance += net;
  }

  const current = accounts.find(
    (a) => a.accountType === "current" && !a.isExcludedFromHouseholdTotals
  );

  return {
    lloydsBalancePence: current ? nets.get(current.id) ?? 0 : currentBalance,
    currentBalancePence: currentBalance,
    savingsBalancePence: savingsBalance,
    netPositionPence: currentBalance + savingsBalance,
  };
}

// Total saved = manual transfers + net of savings accounts (positive only).
export async function getTotalSaved(): Promise<number> {
  const pos = await getHouseholdPosition();
  return Math.max(0, pos.savingsBalancePence);
}

// Allocate total saved across goals in priority order: fill goal 1, then 2...
export async function getSavingsGoalsWithProgress() {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.isActive, true))
    .orderBy(asc(savingsGoals.priority));
  let remaining = await getTotalSaved();
  return goals.map((g) => {
    const allocated = Math.min(remaining, g.targetPence);
    remaining -= allocated;
    return {
      ...g,
      allocatedPence: allocated,
      percent: g.targetPence > 0 ? Math.min(100, (allocated / g.targetPence) * 100) : 0,
      complete: allocated >= g.targetPence,
    };
  });
}

async function spendForCategory(
  category: string,
  start: string,
  end: string
): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`coalesce(sum(case when ${transactions.amountPence} < 0 then -${transactions.amountPence} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.category, category),
        eq(transactions.isExcluded, false),
        gte(transactions.transactionDate, start),
        lte(transactions.transactionDate, end)
      )
    );
  return Number(rows[0]?.total ?? 0);
}

export async function getBudgetTargets() {
  return db.select().from(budgetTargets).orderBy(asc(budgetTargets.category));
}

export async function getWeeklyTracker(period: "this" | "last" = "last") {
  const { start, end } =
    period === "last" ? lastWeekRange() : weekRange();
  const targets = await getBudgetTargets();
  const result: {
    category: string;
    spentPence: number;
    weeklyTargetPence: number;
  }[] = [];
  for (const cat of ["Eating Out", "Groceries"]) {
    const t = targets.find((x) => x.category === cat);
    const spent = await spendForCategory(cat, start, end);
    result.push({
      category: cat,
      spentPence: spent,
      weeklyTargetPence: t?.weeklyTargetPence ?? 0,
    });
  }
  return { start, end, items: result };
}

// Last week's variable spend vs weekly target. The household uploads the
// previous week's export, so last week is the complete, meaningful read that
// drives the dashboard health ring (good/warn/over/danger).
export async function getWeeklyHealth() {
  const w = await getWeeklyTracker("last");
  const spentPence = w.items.reduce((a, i) => a + i.spentPence, 0);
  const targetPence = w.items.reduce((a, i) => a + i.weeklyTargetPence, 0);
  return { start: w.start, end: w.end, spentPence, targetPence, items: w.items };
}

// Headlines: the biggest individual spends this week and any weekly-tracked
// category already over its weekly target.
export async function getHeadlines() {
  const [topSpends, week] = await Promise.all([
    getTopSpendsLastWeek(5),
    getWeeklyTracker("last"),
  ]);
  const overspent = week.items
    .filter(
      (i) => i.weeklyTargetPence > 0 && i.spentPence > i.weeklyTargetPence
    )
    .map((i) => ({
      category: i.category,
      spentPence: i.spentPence,
      targetPence: i.weeklyTargetPence,
      overPence: i.spentPence - i.weeklyTargetPence,
    }));
  return { start: week.start, end: week.end, topSpends, overspent };
}

export async function getMonthlyCategorySpend() {
  const { start, end } = monthRange();
  const targets = await getBudgetTargets();
  const out: {
    category: string;
    spentPence: number;
    monthlyTargetPence: number;
    projectedPence: number;
  }[] = [];
  for (const cat of VARIABLE_CATEGORIES) {
    const t = targets.find((x) => x.category === cat);
    const spent = await spendForCategory(cat, start, end);
    out.push({
      category: cat,
      spentPence: spent,
      monthlyTargetPence: t?.monthlyTargetPence ?? 0,
      projectedPence: projectMonthEnd(spent),
    });
  }
  return { start, end, items: out };
}

export async function getRecentTransactions(limit = 10) {
  return db
    .select({
      id: transactions.id,
      transactionDate: transactions.transactionDate,
      description: transactions.description,
      amountPence: transactions.amountPence,
      category: transactions.category,
      subcategory: transactions.subcategory,
      isExcluded: transactions.isExcluded,
      accountName: bankAccounts.accountName,
    })
    .from(transactions)
    .innerJoin(bankAccounts, eq(transactions.accountId, bankAccounts.id))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(limit);
}

// Uncategorised transactions in the last `days` days. This is the main daily
// driver: nothing can be tracked until it is categorised.
export async function getUncategorised(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = isoDate(since);
  const where = and(
    eq(transactions.category, "Uncategorised"),
    eq(transactions.isExcluded, false),
    gte(transactions.transactionDate, sinceIso)
  );
  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        description: transactions.description,
        amountPence: transactions.amountPence,
        category: transactions.category,
        accountName: bankAccounts.accountName,
      })
      .from(transactions)
      .innerJoin(bankAccounts, eq(transactions.accountId, bankAccounts.id))
      .where(where)
      .orderBy(desc(transactions.transactionDate))
      .limit(50),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(where),
  ]);
  return {
    days,
    total: Number(countRows[0]?.count ?? 0),
    rows,
  };
}

export async function getDaysSinceLastUpload(): Promise<number | null> {
  const rows = await db
    .select({ importedAt: csvImports.importedAt })
    .from(csvImports)
    .orderBy(desc(csvImports.importedAt))
    .limit(1);
  if (rows.length === 0) return null;
  const last = new Date(rows[0].importedAt).getTime();
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}

export type TxFilters = {
  accountId?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minPence?: number;
  maxPence?: number;
  page?: number;
  pageSize?: number;
};

export async function getTransactionsPage(filters: TxFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 50;
  const conds = [];
  if (filters.accountId) conds.push(eq(transactions.accountId, filters.accountId));
  if (filters.category) conds.push(eq(transactions.category, filters.category));
  if (filters.search)
    conds.push(ilike(transactions.description, `%${filters.search}%`));
  if (filters.dateFrom)
    conds.push(gte(transactions.transactionDate, filters.dateFrom));
  if (filters.dateTo)
    conds.push(lte(transactions.transactionDate, filters.dateTo));
  if (filters.minPence != null)
    conds.push(gte(transactions.amountPence, filters.minPence));
  if (filters.maxPence != null)
    conds.push(lte(transactions.amountPence, filters.maxPence));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        transactionDate: transactions.transactionDate,
        description: transactions.description,
        amountPence: transactions.amountPence,
        category: transactions.category,
        subcategory: transactions.subcategory,
        isExcluded: transactions.isExcluded,
        isManuallyCategorised: transactions.isManuallyCategorised,
        notes: transactions.notes,
        accountName: bankAccounts.accountName,
      })
      .from(transactions)
      .innerJoin(bankAccounts, eq(transactions.accountId, bankAccounts.id))
      .where(where)
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(where),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  return { rows, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getCategoryOptions(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: categoryRules.category })
    .from(categoryRules);
  const set = new Set<string>(["Uncategorised", "Income", "Transfer"]);
  for (const r of rows) set.add(r.category);
  for (const c of VARIABLE_CATEGORIES) set.add(c);
  return [...set].sort();
}

export async function getSubscriptions() {
  return db
    .select()
    .from(subscriptions)
    .orderBy(desc(subscriptions.monthlyCostPence));
}

export async function getRecentImports(limit = 10) {
  return db
    .select({
      id: csvImports.id,
      filename: csvImports.filename,
      importedAt: csvImports.importedAt,
      rowsTotal: csvImports.rowsTotal,
      rowsImported: csvImports.rowsImported,
      rowsSkippedDuplicates: csvImports.rowsSkippedDuplicates,
      rowsUncategorised: csvImports.rowsUncategorised,
      accountName: bankAccounts.accountName,
    })
    .from(csvImports)
    .innerJoin(bankAccounts, eq(csvImports.accountId, bankAccounts.id))
    .orderBy(desc(csvImports.importedAt))
    .limit(limit);
}

export async function getSavingsTransfers() {
  return db
    .select()
    .from(savingsTransfers)
    .orderBy(asc(savingsTransfers.transferDate));
}

// Monthly net spend per category over the last `months` months.
export async function getCategoryMonthlySeries(category: string, months = 6) {
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.transactionDate}::date, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(case when ${transactions.amountPence} < 0 then -${transactions.amountPence} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.category, category),
        eq(transactions.isExcluded, false)
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`)
    .limit(months);
  return rows.reverse().map((r) => ({ month: r.month, pence: Number(r.total) }));
}

export async function getAppleBills() {
  return db
    .select({
      transactionDate: transactions.transactionDate,
      amountPence: transactions.amountPence,
      description: transactions.description,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.category, "Subscriptions"),
        eq(transactions.subcategory, "Apple")
      )
    )
    .orderBy(asc(transactions.transactionDate));
}

export async function getInsightsComparison() {
  const cats = await getCategoryOptions();
  const thisMonth = monthRange(new Date());
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = monthRange(lastMonthDate);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const out: {
    category: string;
    thisMonth: number;
    lastMonth: number;
    sixMonthAvg: number;
  }[] = [];

  for (const cat of cats) {
    if (cat === "Income" || cat === "Transfer" || cat === "Uncategorised")
      continue;
    const tm = await spendForCategory(cat, thisMonth.start, thisMonth.end);
    const lm = await spendForCategory(cat, lastMonth.start, lastMonth.end);
    const sixRows = await db
      .select({
        total: sql<number>`coalesce(sum(case when ${transactions.amountPence} < 0 then -${transactions.amountPence} else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.category, cat),
          eq(transactions.isExcluded, false),
          gte(
            transactions.transactionDate,
            sixMonthsAgo.toISOString().slice(0, 10)
          )
        )
      );
    const sixTotal = Number(sixRows[0]?.total ?? 0);
    if (tm === 0 && lm === 0 && sixTotal === 0) continue;
    out.push({
      category: cat,
      thisMonth: tm,
      lastMonth: lm,
      sixMonthAvg: Math.round(sixTotal / 6),
    });
  }
  return out.sort((a, b) => b.thisMonth - a.thisMonth);
}

export async function getTopSpendsThisWeek(
  limit = 10,
  period: "this" | "last" = "this"
) {
  const { start, end } = period === "last" ? lastWeekRange() : weekRange();
  return db
    .select({
      transactionDate: transactions.transactionDate,
      description: transactions.description,
      amountPence: transactions.amountPence,
      category: transactions.category,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.isExcluded, false),
        sql`${transactions.amountPence} < 0`,
        gte(transactions.transactionDate, start),
        lte(transactions.transactionDate, end)
      )
    )
    .orderBy(asc(transactions.amountPence))
    .limit(limit);
}

export function getTopSpendsLastWeek(limit = 10) {
  return getTopSpendsThisWeek(limit, "last");
}

// This-month actual for a budget target, matched by category OR subcategory
// name (fixed costs map to subcategories like "Mortgage", "Council Tax").
export async function getBudgetActualsThisMonth(): Promise<
  Map<string, number>
> {
  const { start, end } = monthRange();
  const rows = await db
    .select({
      category: transactions.category,
      subcategory: transactions.subcategory,
      total: sql<number>`coalesce(sum(case when ${transactions.amountPence} < 0 then -${transactions.amountPence} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.isExcluded, false),
        gte(transactions.transactionDate, start),
        lte(transactions.transactionDate, end)
      )
    )
    .groupBy(transactions.category, transactions.subcategory);

  const map = new Map<string, number>();
  for (const r of rows) {
    const amt = Number(r.total);
    if (r.category) map.set(r.category, (map.get(r.category) ?? 0) + amt);
    if (r.subcategory)
      map.set(r.subcategory, (map.get(r.subcategory) ?? 0) + amt);
  }
  return map;
}

// Apple bill transactions grouped by amount, so each recurring sub can be
// labelled over time.
export async function getAppleBillGroups() {
  const rows = await getAppleBills();
  const groups = new Map<number, { count: number; lastDate: string }>();
  for (const r of rows) {
    const key = r.amountPence;
    const g = groups.get(key);
    if (!g) groups.set(key, { count: 1, lastDate: r.transactionDate });
    else {
      g.count += 1;
      if (r.transactionDate > g.lastDate) g.lastDate = r.transactionDate;
    }
  }
  return [...groups.entries()]
    .map(([amountPence, v]) => ({ amountPence, ...v }))
    .sort((a, b) => a.amountPence - b.amountPence);
}

export async function getAppleBillTransactions() {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.category, "Subscriptions"),
        eq(transactions.subcategory, "Apple"),
        ne(transactions.amountPence, 0)
      )
    )
    .orderBy(desc(transactions.transactionDate));
}

// Average monthly net income from history: total positive "Income" across the
// distinct months it appears in. 0 if there's no income data yet.
export async function getAverageMonthlyIncomePence(): Promise<number> {
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.transactionDate}::date, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(case when ${transactions.amountPence} > 0 then ${transactions.amountPence} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.category, "Income"),
        eq(transactions.isExcluded, false)
      )
    )
    .groupBy(sql`1`);
  if (rows.length === 0) return 0;
  const total = rows.reduce((a, r) => a + Number(r.total), 0);
  return Math.round(total / rows.length);
}

// Everything the Outlook projection and its what-if need. Returns the base
// inputs, the per-variable-category breakdown (the editable lever) and the
// computed result for the initial server render.
export async function getPlannedPayments() {
  return db
    .select()
    .from(plannedPayments)
    .orderBy(asc(plannedPayments.dueDate));
}

export async function getOutlookModel() {
  const [startingSavedPence, targets, goalRows, historical, override, planned] =
    await Promise.all([
      getTotalSaved(),
      getBudgetTargets(),
      db
        .select({
          name: savingsGoals.name,
          targetPence: savingsGoals.targetPence,
        })
        .from(savingsGoals)
        .where(eq(savingsGoals.isActive, true))
        .orderBy(asc(savingsGoals.priority))
        .limit(1),
      getAverageMonthlyIncomePence(),
      getIncomeOverridePence(),
      getPlannedPayments(),
    ]);

  const sumByType = (type: string) =>
    targets
      .filter((t) => t.type === type)
      .reduce((a, t) => a + t.monthlyTargetPence, 0);

  const variableTargets = targets
    .filter((t) => t.type === "variable")
    .map((t) => ({
      id: t.id,
      category: t.category,
      monthlyTargetPence: t.monthlyTargetPence,
    }));

  const monthlyFixedPence = sumByType("fixed");
  const monthlySubscriptionPence = sumByType("subscription");
  const monthlyBufferPence = sumByType("buffer");

  const monthlyIncomePence = override ?? historical;
  const monthsRemaining = monthsUntilGoal();
  const goal = goalRows[0] ?? { name: "Savings goal", targetPence: 0 };

  // Only planned payments still ahead of us and on/before the goal date count
  // against the projection.
  const todayIso = isoDate(new Date());
  const plannedPaymentsList = planned.map((p) => ({
    id: p.id,
    name: p.name,
    amountPence: p.amountPence,
    dueDate: p.dueDate,
  }));
  const plannedTotalPence = plannedPaymentsList
    .filter((p) => p.dueDate >= todayIso && p.dueDate <= OUTLOOK_GOAL_DATE)
    .reduce((a, p) => a + p.amountPence, 0);

  const inputs = {
    startingSavedPence,
    monthlyIncomePence,
    monthlyFixedPence,
    monthlySubscriptionPence,
    monthlyBufferPence,
    variable: variableTargets.map((t) => ({
      category: t.category,
      monthlyPence: t.monthlyTargetPence,
    })),
    plannedTotalPence,
    monthsRemaining,
    goalTargetPence: goal.targetPence,
  };

  return {
    inputs,
    result: computeOutlook(inputs),
    variableTargets,
    plannedPayments: plannedPaymentsList,
    historicalIncomePence: historical,
    incomeIsOverridden: override != null,
    goalName: goal.name,
    goalDate: OUTLOOK_GOAL_DATE,
    todayIso,
  };
}
