import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { spendStatus, STATUS_BAR, STATUS_TEXT } from "@/lib/status";

type Item = {
  category: string;
  spentPence: number;
  weeklyTargetPence: number;
};

// Current week so far: how much is spent and, the headline, how much is left
// to spend on each tracked item before the week ends on Monday.
export function ThisWeek({
  items,
  daysLeft,
}: {
  items: Item[];
  daysLeft: number;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {daysLeft === 1
          ? "Last day of the week"
          : `${daysLeft} days left this week`}{" "}
        (Tue–Mon, resets Tuesday)
      </p>
      {items.map((w) => {
        const status = spendStatus(w.spentPence, w.weeklyTargetPence);
        const remaining = w.weeklyTargetPence - w.spentPence;
        const pct =
          w.weeklyTargetPence > 0
            ? Math.min(100, (w.spentPence / w.weeklyTargetPence) * 100)
            : w.spentPence > 0
              ? 100
              : 0;
        return (
          <div key={w.category} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{w.category}</span>
              <span className={cn("tabular-nums", STATUS_TEXT[status])}>
                {remaining >= 0
                  ? `${formatPence(remaining)} left`
                  : `${formatPence(-remaining)} over`}
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all",
                  STATUS_BAR[status]
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatPence(w.spentPence)} of {formatPence(w.weeklyTargetPence)}{" "}
              spent so far
            </p>
          </div>
        );
      })}
    </div>
  );
}
