import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { daysLeftInMonth } from "@/lib/dates";

type Level = "warn" | "danger" | "info";

function Banner({ level, children }: { level: Level; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-4 py-3 text-sm",
        level === "danger" &&
          "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
        level === "warn" &&
          "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
        level === "info" &&
          "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
      )}
    >
      {level === "info" ? (
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

export function DashboardAlerts({
  daysSinceUpload,
  weekly,
  monthly,
  lloydsBalancePence,
}: {
  daysSinceUpload: number | null;
  weekly: { category: string; spentPence: number; weeklyTargetPence: number }[];
  monthly: {
    category: string;
    spentPence: number;
    monthlyTargetPence: number;
    projectedPence: number;
  }[];
  lloydsBalancePence: number;
}) {
  const banners: React.ReactNode[] = [];

  if (daysSinceUpload == null) {
    banners.push(
      <Banner key="no-upload" level="warn">
        No CSV has been uploaded yet. Drop a CSV on the Upload page to populate
        the dashboard.
      </Banner>
    );
  } else if (daysSinceUpload > 7) {
    banners.push(
      <Banner key="stale" level="warn">
        Last upload {daysSinceUpload} days ago - drop a CSV to refresh.
      </Banner>
    );
  }

  for (const w of weekly) {
    if (w.weeklyTargetPence <= 0) continue;
    const ratio = w.spentPence / w.weeklyTargetPence;
    if (ratio >= 1) {
      banners.push(
        <Banner key={`wk-${w.category}`} level="danger">
          {w.category} this week is {formatPence(w.spentPence)} of{" "}
          {formatPence(w.weeklyTargetPence)}. Ease off{" "}
          {w.category.toLowerCase()} for the rest of the week.
        </Banner>
      );
    } else if (ratio >= 0.8) {
      banners.push(
        <Banner key={`wk-${w.category}`} level="warn">
          {w.category} this week is {formatPence(w.spentPence)} of{" "}
          {formatPence(w.weeklyTargetPence)}.
        </Banner>
      );
    }
  }

  const daysLeft = daysLeftInMonth();
  for (const m of monthly) {
    if (m.monthlyTargetPence <= 0) continue;
    if (m.projectedPence > m.monthlyTargetPence && m.spentPence > 0) {
      banners.push(
        <Banner key={`mo-${m.category}`} level="warn">
          {m.category} on track to exceed {formatPence(m.monthlyTargetPence)}{" "}
          budget (currently {formatPence(m.spentPence)} with {daysLeft} days
          left).
        </Banner>
      );
    }
  }

  if (lloydsBalancePence < 10000) {
    banners.push(
      <Banner key="balance" level="danger">
        Halifax balance is {formatPence(lloydsBalancePence)}. Consider
        transferring from savings.
      </Banner>
    );
  }

  if (banners.length === 0) return null;
  return <div className="space-y-2">{banners}</div>;
}
