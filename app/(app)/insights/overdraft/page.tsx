import Link from "next/link";
import {
  getBalanceProgression,
  analyseBalance,
  projectOverdraftClearance,
  getAverageMonthlyOverdraftInterestPence,
  getMonthlyCategorySpend,
} from "@/lib/queries-cached";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { balanceStatus, STATUS_TEXT } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Lightbulb,
} from "lucide-react";
import { BalanceChart } from "./balance-chart";

export const metadata = {
  title: "Overdraft progression - Billam Family Budget",
};

export default async function OverdraftPage() {
  const [progression, odiAvg, monthly] = await Promise.all([
    getBalanceProgression(),
    getAverageMonthlyOverdraftInterestPence(),
    getMonthlyCategorySpend(),
  ]);

  const analysis = analyseBalance(progression.points);
  const clearance = projectOverdraftClearance(progression.points);
  const chartData = progression.points.map((p) => ({
    date: p.date,
    balance: p.balancePence / 100,
  }));

  function monthLabel(iso: string): string {
    return new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString(
      "en-GB",
      { month: "long", year: "numeric" }
    );
  }

  let clearanceHeadline: string;
  let clearanceDetail: string;
  let clearanceAccent: "good" | "warn" | "danger" | "muted" = "muted";
  if (!clearance) {
    clearanceHeadline = "Not enough history yet";
    clearanceDetail = "Import more transactions and this projection will fill in.";
  } else if (clearance.status === "out") {
    clearanceHeadline = "Already out at the low point";
    clearanceDetail =
      "The lowest balance in each of the last six months was above zero.";
    clearanceAccent = "good";
  } else if (clearance.status === "improving" && clearance.projectedClearMonth) {
    clearanceHeadline = `Out of overdraft at the low point around ${monthLabel(
      clearance.projectedClearMonth
    )}`;
    clearanceDetail = `Monthly lows are rising by ${formatPence(
      Math.round(clearance.slopePencePerMonth)
    )} per month at current pace.`;
    clearanceAccent = "good";
  } else if (clearance.status === "worsening") {
    clearanceHeadline = "Not clearing - monthly lows are getting deeper";
    clearanceDetail = `Lows have trended down by ${formatPence(
      Math.round(-clearance.slopePencePerMonth)
    )} per month over the last six months. Pull variable spend back to budget to reverse this.`;
    clearanceAccent = "danger";
  } else {
    clearanceHeadline = "Flat - no clear improvement at the low point";
    clearanceDetail =
      "Monthly lows aren't trending up over the last six months. A small, consistent cut each month gets a projection going.";
    clearanceAccent = "warn";
  }

  const clearanceColour =
    clearanceAccent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : clearanceAccent === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : clearanceAccent === "danger"
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground";

  // Build data-driven warnings and advice.
  const warnings: string[] = [];
  const advice: string[] = [];

  if (analysis) {
    const inOverdraftPct = Math.round(
      (analysis.daysInOverdraft / analysis.totalDays) * 100
    );
    if (analysis.current < 0) {
      warnings.push(
        `Currently in overdraft at ${formatPence(analysis.current)}. ` +
          `You have been in overdraft on ${analysis.daysInOverdraft} of ` +
          `${analysis.totalDays} tracked days (${inOverdraftPct}%).`
      );
    }

    if (analysis.change30 != null) {
      if (analysis.change30 < -5000) {
        warnings.push(
          `Balance has fallen by ${formatPence(
            -analysis.change30
          )} over the last 30 days.`
        );
      } else if (analysis.change30 > 5000) {
        advice.push(
          `Balance has risen by ${formatPence(
            analysis.change30
          )} over the last 30 days - the trend is positive, keep this pattern going.`
        );
      }
    }

    if (
      analysis.change90 != null &&
      analysis.change30 != null &&
      analysis.change90 < analysis.change30 * 3 &&
      analysis.recentTrend === "improving"
    ) {
      advice.push(
        `The most recent 30 days are improving faster than the 90-day average - recent changes are working.`
      );
    }

    if (analysis.recentTrend === "worsening") {
      warnings.push(
        `The last 3 months net to a decline of ${formatPence(
          -analysis.monthlyChange.slice(-3).reduce((a, m) => a + m.change, 0)
        )}. The gap needs closing.`
      );
    }

    if (odiAvg > 0 && analysis.current < 0) {
      advice.push(
        `Overdraft interest has averaged ${formatPence(
          odiAvg
        )}/month. Clearing the overdraft would save roughly ${formatPence(
          odiAvg * 12
        )} a year.`
      );
    }
  }

  // Variable-category overspends ranked by excess, used for cut suggestions.
  const overspends = monthly.items
    .filter(
      (m) =>
        m.monthlyTargetPence > 0 &&
        m.spentPence > 0 &&
        m.projectedPence > m.monthlyTargetPence
    )
    .map((m) => ({
      category: m.category,
      overBy: m.projectedPence - m.monthlyTargetPence,
      spent: m.spentPence,
      target: m.monthlyTargetPence,
      projected: m.projectedPence,
    }))
    .sort((a, b) => b.overBy - a.overBy);

  const cuts = overspends.slice(0, 3).map(
    (o) =>
      `${o.category}: on track for ${formatPence(
        o.projected
      )} this month vs ${formatPence(o.target)} budget. Cut ${formatPence(
        o.overBy
      )} to come back on target.`
  );

  const trendIcon =
    analysis?.recentTrend === "improving" ? (
      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
    ) : analysis?.recentTrend === "worsening" ? (
      <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
    ) : (
      <Minus className="h-5 w-5 text-muted-foreground" />
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Overdraft progression
          </h1>
          <p className="text-sm text-muted-foreground">
            Where your current-account balance is heading, and what to do about it.
          </p>
        </div>
        <Link
          href="/insights"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to Insights
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>
              {progression.accountName ?? "Current account"} balance over time
            </span>
            {analysis && (
              <span
                className={cn(
                  "flex items-center gap-1 text-sm tabular-nums",
                  STATUS_TEXT[balanceStatus(analysis.current)]
                )}
              >
                {trendIcon}
                {formatPence(analysis.current)}
              </span>
            )}
          </CardTitle>
          {analysis && (
            <CardDescription>
              Lowest {formatPence(analysis.lowest.balancePence)} on{" "}
              {formatDisplayDate(analysis.lowest.date)}; highest{" "}
              {formatPence(analysis.highest.balancePence)} on{" "}
              {formatDisplayDate(analysis.highest.date)}.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn("rounded-md border p-3", clearanceColour)}>
            <p className="text-sm font-medium">{clearanceHeadline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {clearanceDetail}
            </p>
          </div>
          <BalanceChart data={chartData} />
          {clearance && clearance.monthlyLows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Monthly low points (last 6)
              </p>
              <ul className="divide-y text-sm">
                {clearance.monthlyLows.slice(-6).map((m) => (
                  <li
                    key={m.month}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-muted-foreground">
                      {monthLabel(`${m.month}-01`)}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        m.lowPence < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatPence(m.lowPence)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ChangeCard label="Last 30 days" valuePence={analysis.change30} />
          <ChangeCard label="Last 90 days" valuePence={analysis.change90} />
          <ChangeCard label="Last 180 days" valuePence={analysis.change180} />
        </div>
      )}

      {analysis && analysis.monthlyChange.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly net change</CardTitle>
            <CardDescription>
              Did the balance move up or down in each month? Positive =
              rebuilding, negative = eating into it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {analysis.monthlyChange.slice(-12).map((m) => (
                <li
                  key={m.month}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-muted-foreground">
                    {new Date(`${m.month}-01`).toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      m.change > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : m.change < 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                    )}
                  >
                    {m.change > 0 ? "+" : ""}
                    {formatPence(m.change)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing flagged - the balance isn&apos;t in overdraft and the
              trend is stable or positive.
            </p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            What to cut
          </CardTitle>
          <CardDescription>
            Based on this month&apos;s spend vs your variable budget targets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cuts.length === 0 && advice.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No category is projected to exceed its budget this month.
            </p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {cuts.map((c, i) => (
                <li key={`cut-${i}`}>{c}</li>
              ))}
              {advice.map((a, i) => (
                <li key={`adv-${i}`}>{a}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {overspends.length > 3 && (
        <p className="text-xs text-muted-foreground">
          {overspends.length - 3} other variable categories are also projected
          over budget - see Dashboard or Budget pages for the full picture.
        </p>
      )}

    </div>
  );
}

function ChangeCard({
  label,
  valuePence,
}: {
  label: string;
  valuePence: number | null;
}) {
  if (valuePence == null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-xl text-muted-foreground">
            Not enough history
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }
  const direction =
    valuePence > 0 ? "up" : valuePence < 0 ? "down" : "flat";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "flex items-center gap-1 text-xl tabular-nums",
            direction === "up" && "text-emerald-600 dark:text-emerald-400",
            direction === "down" && "text-red-600 dark:text-red-400"
          )}
        >
          {direction === "up" ? (
            <TrendingUp className="h-5 w-5" />
          ) : direction === "down" ? (
            <TrendingDown className="h-5 w-5" />
          ) : (
            <Minus className="h-5 w-5" />
          )}
          {valuePence > 0 ? "+" : ""}
          {formatPence(valuePence)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
