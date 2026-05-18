import {
  getSavingsGoalsWithProgress,
  getSavingsTransfers,
  getTotalSaved,
} from "@/lib/queries-cached";
import { SavingsView } from "./savings-view";

export const metadata = { title: "Savings - Billam Family Budget" };

export default async function SavingsPage() {
  const [goals, transfers, totalSaved] = await Promise.all([
    getSavingsGoalsWithProgress(),
    getSavingsTransfers(),
    getTotalSaved(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Savings</h1>
        <p className="text-sm text-muted-foreground">
          Cumulative savings, monthly transfers and goal progress.
        </p>
      </header>

      <SavingsView
        totalSaved={totalSaved}
        transfers={transfers.map((t) => ({
          id: t.id,
          transferDate: t.transferDate,
          amountPence: t.amountPence,
          notes: t.notes,
        }))}
        goals={goals.map((g) => ({
          id: g.id,
          name: g.name,
          targetPence: g.targetPence,
          allocatedPence: g.allocatedPence,
          percent: g.percent,
          complete: g.complete,
          targetDate: g.targetDate,
          priority: g.priority,
        }))}
      />
    </div>
  );
}
