import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import type { OutlookResult } from "@/lib/outlook";

// iCloud-storage-style horizontal bar. One bar split into what gets saved vs
// what gets spent over the whole stretch to the goal date, plus a slim goal
// progress bar showing whether the projected pot clears the single goal.
// Pure/presentational so it renders on the server and inside the client
// what-if alike.
export function OutlookBar({
  result,
  goalName,
  goalDate,
  monthsRemaining,
  className,
}: {
  result: OutlookResult;
  goalName: string;
  goalDate: string;
  monthsRemaining: number;
  className?: string;
}) {
  const {
    projectedSavedPence,
    totalSpentPence,
    goalTargetPence,
    goalShortfallPence,
    goalReached,
    monthlySurplusPence,
    savedFraction,
  } = result;

  const savedPct = Math.round(savedFraction * 100);
  const goalPct =
    goalTargetPence > 0
      ? Math.min(
          100,
          Math.max(0, (Math.max(0, projectedSavedPence) / goalTargetPence) * 100)
        )
      : 0;

  const deficit = monthlySurplusPence < 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Projected by {formatDisplayDate(goalDate)}
          </p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums sm:text-3xl",
              goalReached
                ? "text-emerald-600 dark:text-emerald-400"
                : deficit
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
            )}
          >
            {formatPence(projectedSavedPence)}
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {monthsRemaining} month{monthsRemaining === 1 ? "" : "s"} ·{" "}
          {deficit ? "−" : "+"}
          {formatPence(Math.abs(monthlySurplusPence))}/mo
        </p>
      </div>

      {/* Saved vs spent over the whole period */}
      <div>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-foreground/10">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${savedPct}%` }}
          />
          <div
            className="h-full bg-zinc-400 transition-all dark:bg-zinc-600"
            style={{ width: `${100 - savedPct}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Saved {formatPence(Math.max(0, projectedSavedPence))}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
            Spent {formatPence(totalSpentPence)} over the period
          </span>
        </div>
      </div>

      {/* Progress towards the single goal */}
      {goalTargetPence > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{goalName}</span>
            <span
              className={cn(
                "tabular-nums",
                goalReached
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {goalReached
                ? `On track · ${formatPence(goalTargetPence)}`
                : `${formatPence(goalShortfallPence)} short of ${formatPence(
                    goalTargetPence
                  )}`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                goalReached ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
