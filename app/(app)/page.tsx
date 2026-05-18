import Link from "next/link";
import {
  getHouseholdPosition,
  getSavingsGoalsWithProgress,
  getWeeklyTracker,
  getMonthlyCategorySpend,
  getRecentTransactions,
  getDaysSinceLastUpload,
  getCategoryOptions,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SpendBar } from "@/components/spend-bar";
import { CategorySelect } from "@/components/category-select";
import { DashboardAlerts } from "@/components/alerts";

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
  ] = await Promise.all([
    getHouseholdPosition(),
    getSavingsGoalsWithProgress(),
    getWeeklyTracker(),
    getMonthlyCategorySpend(),
    getRecentTransactions(10),
    getDaysSinceLastUpload(),
    getCategoryOptions(),
  ]);

  const balStatus = balanceStatus(position.lloydsBalancePence);
  const heroGoals = goals.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Household position and this period&apos;s spend.
        </p>
      </header>

      <DashboardAlerts
        daysSinceUpload={daysSinceUpload}
        weekly={weekly.items}
        monthly={monthly.items}
        lloydsBalancePence={position.lloydsBalancePence}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lloyds Joint</CardDescription>
            <CardTitle
              className={cn(
                "text-3xl tabular-nums",
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
            <CardTitle className="text-3xl tabular-nums">
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
            <CardTitle className="text-3xl tabular-nums">
              {formatPence(position.netPositionPence)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Current plus savings
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {heroGoals.map((g) => (
          <Card key={g.id} className={g.complete ? "border-emerald-500" : ""}>
            <CardHeader className="pb-2">
              <CardDescription>{g.name}</CardDescription>
              <CardTitle className="text-xl tabular-nums">
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
          <CardTitle className="text-base">This week</CardTitle>
          <CardDescription>
            {formatDisplayDate(weekly.start)} to{" "}
            {formatDisplayDate(weekly.end)}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This month&apos;s spend</CardTitle>
          <CardDescription>
            Month to date, target, and projected end of month.
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDisplayDate(t.transactionDate)}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">
                      {t.description}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums text-sm",
                        t.amountPence < 0
                          ? "text-foreground"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatPence(t.amountPence)}
                    </TableCell>
                    <TableCell>
                      <CategorySelect
                        id={t.id}
                        value={t.category}
                        options={categoryOptions}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
