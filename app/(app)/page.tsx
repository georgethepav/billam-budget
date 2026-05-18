import Link from "next/link";
import {
  Inbox,
  Newspaper,
  CalendarDays,
  CalendarRange,
  PiggyBank,
  Receipt,
  TrendingDown,
} from "lucide-react";
import {
  getHouseholdPosition,
  getSavingsGoalsWithProgress,
  getWeeklyHealth,
  getWeeklyTracker,
  getMonthlyCategorySpend,
  getHeadlines,
  getRecentTransactions,
  getDaysSinceLastUpload,
  getCategoryOptions,
  getUncategorised,
} from "@/lib/queries-cached";
import { formatPence, formatPenceCompact } from "@/lib/money";
import { formatDisplayDate, formatDayDate, daysLeftInWeek } from "@/lib/dates";
import { balanceStatus, STATUS_TEXT } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SpendBar } from "@/components/spend-bar";
import { CategorySelect } from "@/components/category-select";
import { DashboardAlerts } from "@/components/alerts";
import { UncategorisedPanel } from "@/components/uncategorised-panel";
import { CategoryDonut } from "@/components/dashboard-charts";
import { HealthRing, HubCard } from "@/components/dashboard-hub";
import { ThisWeek } from "@/components/this-week";

export const metadata = { title: "Dashboard - Billam Family Budget" };

export default async function DashboardPage() {
  const [
    position,
    goals,
    health,
    week,
    thisWeek,
    monthly,
    headlines,
    recent,
    daysSinceUpload,
    categoryOptions,
    uncategorised,
  ] = await Promise.all([
    getHouseholdPosition(),
    getSavingsGoalsWithProgress(),
    getWeeklyHealth(),
    getWeeklyTracker("last"),
    getWeeklyTracker("this"),
    getMonthlyCategorySpend(),
    getHeadlines(),
    getRecentTransactions(10),
    getDaysSinceLastUpload(),
    getCategoryOptions(),
    getUncategorised(30),
  ]);

  const balStatus = balanceStatus(position.lloydsBalancePence);
  const heroGoals = goals.slice(0, 3);
  const pending = uncategorised.total;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          How last week went, and what needs a look.
        </p>
      </header>

      {/* Health ring + the figures that matter at a glance */}
      <Card>
        <CardContent className="space-y-4">
          <HealthRing
            spentPence={health.spentPence}
            targetPence={health.targetPence}
            caption={`Last week · ${formatDayDate(health.start)} – ${formatDayDate(
              health.end
            )} ${health.end.slice(0, 4)}`}
          />
          <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Halifax</p>
              <p
                className={cn(
                  "text-base font-semibold tabular-nums sm:text-lg",
                  STATUS_TEXT[balStatus]
                )}
              >
                {formatPence(position.lloydsBalancePence)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Savings</p>
              <p className="text-base font-semibold tabular-nums sm:text-lg">
                {formatPence(position.savingsBalancePence)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="text-base font-semibold tabular-nums sm:text-lg">
                {formatPence(position.netPositionPence)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications / tasks that need attention */}
      <DashboardAlerts
        daysSinceUpload={daysSinceUpload}
        weekly={health.items}
        monthly={monthly.items}
        lloydsBalancePence={position.lloydsBalancePence}
      />

      <HubCard
        title="Sort uncategorised"
        description={
          pending > 0
            ? "Nothing is tracked until it has a category."
            : `All clear for the last ${uncategorised.days} days.`
        }
        icon={
          <Inbox className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        }
        badge={pending > 0 ? pending : undefined}
        badgeVariant="destructive"
        accent={pending > 0}
        defaultOpen={pending > 0}
      >
        <UncategorisedPanel
          bare
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
      </HubCard>

      <HubCard
        title="Headlines"
        description="Biggest spends and overspends last week."
        icon={
          <Newspaper className="h-5 w-5 text-muted-foreground" />
        }
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Over budget last week</p>
            {headlines.overspent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing over its weekly target last week. Nice.
              </p>
            ) : (
              <ul className="space-y-2">
                {headlines.overspent.map((o) => (
                  <li
                    key={o.category}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      {o.category}
                    </span>
                    <span className="tabular-nums text-red-600 dark:text-red-400">
                      {formatPence(o.spentPence)} of{" "}
                      {formatPence(o.targetPence)}
                      <span className="ml-1 text-xs">
                        (+{formatPence(o.overPence)})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Biggest spends last week</p>
            {headlines.topSpends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending recorded last week.
              </p>
            ) : (
              <ul className="divide-y">
                {headlines.topSpends.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {t.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayDate(t.transactionDate)} - {t.category}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatPence(t.amountPence)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </HubCard>

      <HubCard
        title="This week"
        description={`${formatDayDate(thisWeek.start)} – ${formatDayDate(
          thisWeek.end
        )} ${thisWeek.end.slice(0, 4)} · what's left to spend`}
        icon={<CalendarRange className="h-5 w-5 text-muted-foreground" />}
        defaultOpen
      >
        <ThisWeek items={thisWeek.items} daysLeft={daysLeftInWeek()} />
      </HubCard>

      <HubCard
        title="Last week"
        description={`${formatDayDate(week.start)} – ${formatDayDate(
          week.end
        )} ${week.end.slice(0, 4)}`}
        icon={
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
        }
      >
        <div className="space-y-4">
          {week.items.map((w) => (
            <SpendBar
              key={w.category}
              label={w.category}
              spentPence={w.spentPence}
              targetPence={w.weeklyTargetPence}
            />
          ))}
        </div>
      </HubCard>

      <HubCard
        title="The month"
        description="Where the money has gone, and the projection."
        icon={
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        }
      >
        <div className="space-y-6">
          <CategoryDonut
            items={monthly.items.map((m) => ({
              category: m.category,
              spentPence: m.spentPence,
            }))}
          />
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">This month vs target</p>
            {monthly.items.map((m) => (
              <SpendBar
                key={m.category}
                label={m.category}
                spentPence={m.spentPence}
                targetPence={m.monthlyTargetPence}
                projectedPence={m.projectedPence}
              />
            ))}
          </div>
        </div>
      </HubCard>

      <HubCard
        title="Savings goals"
        description="Progress towards each goal in priority order."
        icon={<PiggyBank className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="space-y-4">
          {heroGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active goals.
            </p>
          ) : (
            heroGoals.map((g) => (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="tabular-nums text-muted-foreground">
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
                  </span>
                </div>
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
              </div>
            ))
          )}
        </div>
      </HubCard>

      <HubCard
        title="Recent transactions"
        description="Last 10 imported - recategorise here if needed."
        icon={<Receipt className="h-5 w-5 text-muted-foreground" />}
      >
        {recent.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No transactions yet. Upload a CSV to get started.
          </p>
        ) : (
          <>
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
            <Link
              href="/transactions"
              className="mt-3 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              View all transactions
            </Link>
          </>
        )}
      </HubCard>
    </div>
  );
}
