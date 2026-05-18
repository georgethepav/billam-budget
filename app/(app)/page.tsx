import Link from "next/link";
import {
  getHouseholdPosition,
  getSavingsGoalsWithProgress,
  getWeeklyTracker,
  getMonthlyCategorySpend,
  getRecentTransactions,
  getDaysSinceLastUpload,
  getCategoryOptions,
  getUncategorised,
} from "@/lib/queries";
import { formatPence, formatPenceCompact } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { balanceStatus, STATUS_TEXT } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SpendBar } from "@/components/spend-bar";
import { CategorySelect } from "@/components/category-select";
import { DashboardAlerts } from "@/components/alerts";
import { UncategorisedPanel } from "@/components/uncategorised-panel";
import { CategoryDonut } from "@/components/dashboard-charts";

export const metadata = { title: "Dashboard - Billam Family Budget" };

export default async function DashboardPage() {
  const [
    position,
    goals,
    weekly,
    monthly,
    recent,
    daysSinceUpload,
    categoryOptions,
    uncategorised,
  ] = await Promise.all([
    getHouseholdPosition(),
    getSavingsGoalsWithProgress(),
    getWeeklyTracker("last"),
    getMonthlyCategorySpend(),
    getRecentTransactions(10),
    getDaysSinceLastUpload(),
    getCategoryOptions(),
    getUncategorised(30),
  ]);

  const balStatus = balanceStatus(position.lloydsBalancePence);
  const heroGoals = goals.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Sort uncategorised first, then review the numbers.
        </p>
      </header>

      <UncategorisedPanel
        rows={uncategorised.rows.map((r) => ({
          id: r.id,
          transactionDate: r.transactionDate,
          description: r.description,
          amountPence: r.amountPence,
          accountName: r.accountName,
        }))}
        total={uncategorised.total}
        days={uncategorised.days}
        options={categoryOptions}
      />

      <DashboardAlerts
        daysSinceUpload={daysSinceUpload}
        weekly={weekly.items}
        monthly={monthly.items}
        lloydsBalancePence={position.lloydsBalancePence}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Halifax</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl tabular-nums sm:text-3xl",
                STATUS_TEXT[balStatus]
              )}
            >
              {formatPence(position.lloydsBalancePence)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Net of imported transactions
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Savings total</CardDescription>
            <CardTitle className="text-2xl tabular-nums sm:text-3xl">
              {formatPence(position.savingsBalancePence)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Savings accounts and recorded transfers
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net position</CardDescription>
            <CardTitle className="text-2xl tabular-nums sm:text-3xl">
              {formatPence(position.netPositionPence)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Current plus savings
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {heroGoals.map((g) => (
          <Card key={g.id} className={g.complete ? "border-emerald-500" : ""}>
            <CardHeader className="pb-2">
              <CardDescription>{g.name}</CardDescription>
              <CardTitle className="text-lg tabular-nums sm:text-xl">
                {g.complete ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {g.name === "Overdraft clear"
                      ? "Overdraft cleared"
                      : "Goal reached"}
                  </span>
                ) : (
                  <>
                    {formatPenceCompact(g.allocatedPence)} of{" "}
                    {formatPenceCompact(g.targetPence)}
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${g.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(g.percent)}%</span>
                {g.targetDate && (
                  <span>Target {formatDisplayDate(g.targetDate)}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last week</CardTitle>
          <CardDescription>
            {formatDisplayDate(weekly.start)} to{" "}
            {formatDisplayDate(weekly.end)} - the most recent complete week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weekly.items.map((w) => (
            <SpendBar
              key={w.category}
              label={w.category}
              spentPence={w.spentPence}
              targetPence={w.weeklyTargetPence}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This month by category</CardTitle>
            <CardDescription>Where the money has gone.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonut
              items={monthly.items.map((m) => ({
                category: m.category,
                spentPence: m.spentPence,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              This month vs target
            </CardTitle>
            <CardDescription>
              Month to date and projected end of month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthly.items.map((m) => (
              <SpendBar
                key={m.category}
                label={m.category}
                spentPence={m.spentPence}
                targetPence={m.monthlyTargetPence}
                projectedPence={m.projectedPence}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <CardDescription>Last 10 imported</CardDescription>
          </div>
          <Link
            href="/transactions"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No transactions yet. Upload a CSV to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDate(t.transactionDate)} - {t.accountName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={cn(
                        "tabular-nums text-sm",
                        t.amountPence >= 0 &&
                          "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatPence(t.amountPence)}
                    </span>
                    <CategorySelect
                      id={t.id}
                      value={t.category}
                      options={categoryOptions}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
