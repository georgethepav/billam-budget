import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import type { OutlookResult } from "@/lib/outlook";

// Fixed colours for the structural segments; variable categories cycle a
// palette in the order they appear so colours stay stable.
const FIXED_COLOURS: Record<string, string> = {
  saved: "bg-emerald-500",
  fixed: "bg-sky-600",
  subscriptions: "bg-violet-500",
  buffer: "bg-zinc-400 dark:bg-zinc-600",
  planned: "bg-rose-500",
};
const VARIABLE_PALETTE = [
  "bg-amber-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-fuchsia-500",
  "bg-lime-600",
  "bg-cyan-500",
  "bg-pink-500",
];

function colourFor(key: string, variableIndex: number): string {
  if (FIXED_COLOURS[key]) return FIXED_COLOURS[key];
  return VARIABLE_PALETTE[variableIndex % VARIABLE_PALETTE.length];
}

// iCloud-storage-style stacked bar. The whole bar is what flows through to the
// goal date: a green "saved" slice plus a coloured slice per spend group
// (fixed, subs, each variable category, buffer, planned). A slim goal bar
// underneath shows whether the projected pot clears the single goal.
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
    segments,
  } = result;

  const savedForBar = Math.max(0, projectedSavedPence);
  const grandTotal = savedForBar + Math.max(0, totalSpentPence);
  const pct = (p: number) => (grandTotal > 0 ? (p / grandTotal) * 100 : 0);
  const deficit = monthlySurplusPence < 0;

  // Build the ordered slices (saved first), tagging variable colours in order.
  let vIdx = 0;
  const slices = [
    { key: "saved", label: "Saved", pence: savedForBar },
    ...segments,
  ].map((s) => {
    const colour = colourFor(
      s.key,
      s.key.startsWith("var:") ? vIdx++ : 0
    );
    return { ...s, colour };
  });

  const goalPct =
    goalTargetPence > 0
      ? Math.min(100, Math.max(0, (savedForBar / goalTargetPence) * 100))
      : 0;

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

      {/* Stacked saved-vs-spend-by-group bar */}
      <div>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-foreground/10">
          {slices.map((s) => (
            <div
              key={s.key}
              className={cn("h-full transition-all", s.colour)}
              style={{ width: `${pct(s.pence)}%` }}
              title={`${s.label}: ${formatPence(s.pence)}`}
            />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", s.colour)} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatPence(s.pence)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Spent over the period: {formatPence(totalSpentPence)}
        </p>
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
