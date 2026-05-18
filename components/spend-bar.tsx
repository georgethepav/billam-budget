import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { spendStatus, STATUS_BAR, STATUS_TEXT } from "@/lib/status";

export function SpendBar({
  label,
  spentPence,
  targetPence,
  projectedPence,
}: {
  label: string;
  spentPence: number;
  targetPence: number;
  projectedPence?: number;
}) {
  const status = spendStatus(spentPence, targetPence);
  const pct =
    targetPence > 0
      ? Math.min(100, (spentPence / targetPence) * 100)
      : spentPence > 0
        ? 100
        : 0;
  const projPct =
    targetPence > 0 && projectedPence != null
      ? Math.min(100, (projectedPence / targetPence) * 100)
      : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", STATUS_TEXT[status])}>
          {formatPence(spentPence)} of {formatPence(targetPence)}
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        {projPct != null && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground/15"
            style={{ width: `${projPct}%` }}
          />
        )}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            STATUS_BAR[status]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {projectedPence != null && targetPence > 0 && (
        <p className="text-xs text-muted-foreground">
          Projected end of month: {formatPence(projectedPence)}
        </p>
      )}
    </div>
  );
}
