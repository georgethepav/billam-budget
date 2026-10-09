import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import type { OutlookResult } from "@/lib/outlook";
import { OutlookBar } from "@/components/outlook-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Side-by-side comparison of the budgeted outlook vs the "current pace"
// outlook (variable budgets swapped for 3-month actual averages). All other
// inputs - income, fixed, subscriptions, buffer, planned, holiday - are
// identical so the difference is attributable to the variable categories.
export function OutlookComparison({
  budgeted,
  actuals,
  goalName,
  goalDate,
  monthsRemaining,
  budgetedVariableMonthlyPence,
  actualsVariableMonthlyPence,
}: {
  budgeted: OutlookResult;
  actuals: OutlookResult;
  goalName: string;
  goalDate: string;
  monthsRemaining: number;
  budgetedVariableMonthlyPence: number;
  actualsVariableMonthlyPence: number;
}) {
  const projectionDelta =
    actuals.projectedSavedPence - budgeted.projectedSavedPence;
  const monthlyVariableDelta =
    actualsVariableMonthlyPence - budgetedVariableMonthlyPence;
  const projectionDeltaIsNegative = projectionDelta < 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budgeted outlook</CardTitle>
            <CardDescription>
              What the plan says: income minus every budget target through to{" "}
              {goalName.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutlookBar
              result={budgeted}
              goalName={goalName}
              goalDate={goalDate}
              monthsRemaining={monthsRemaining}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Current pace outlook
            </CardTitle>
            <CardDescription>
              Variable spend held at the last 3 months&apos; actual average
              instead of the budget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutlookBar
              result={actuals}
              goalName={goalName}
              goalDate={goalDate}
              monthsRemaining={monthsRemaining}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Difference</CardTitle>
          <CardDescription>
            How current spending habits change the projection vs sticking to
            budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            <li className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">
                Variable spend per month
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  monthlyVariableDelta > 0
                    ? "text-red-600 dark:text-red-400"
                    : monthlyVariableDelta < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : ""
                )}
              >
                {monthlyVariableDelta >= 0 ? "+" : ""}
                {formatPence(monthlyVariableDelta)}
              </span>
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">
                Projected pot by {goalName.toLowerCase()}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  projectionDeltaIsNegative
                    ? "text-red-600 dark:text-red-400"
                    : projectionDelta > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : ""
                )}
              >
                {projectionDelta >= 0 ? "+" : ""}
                {formatPence(projectionDelta)}
              </span>
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">
                Projected total spend
              </span>
              <span className="tabular-nums">
                {formatPence(actuals.totalSpentPence)} vs{" "}
                {formatPence(budgeted.totalSpentPence)}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            {projectionDeltaIsNegative
              ? `At current pace you land ${formatPence(
                  -projectionDelta
                )} short of the budgeted projection. Pulling variable spend back to budget closes that gap.`
              : projectionDelta > 0
                ? `Current pace is actually ${formatPence(
                    projectionDelta
                  )} ahead of the budgeted projection - you're spending less than planned.`
                : "Current pace matches the budgeted projection exactly."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
