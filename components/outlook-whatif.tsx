"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { formatPence } from "@/lib/money";
import { computeOutlook, type OutlookInputs } from "@/lib/outlook";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OutlookBar } from "@/components/outlook-bar";
import { updateBudgetMonthly } from "@/app/actions/budget";
import { setProjectedIncome } from "@/app/actions/settings";

type VarTarget = { id: string; category: string; monthlyTargetPence: number };

const toPence = (pounds: string) => {
  const n = Number(pounds);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const toPounds = (pence: number) => (pence / 100).toFixed(2);

export function OutlookWhatIf({
  inputs,
  variableTargets,
  historicalIncomePence,
  goalName,
  goalDate,
}: {
  inputs: OutlookInputs;
  variableTargets: VarTarget[];
  historicalIncomePence: number;
  goalName: string;
  goalDate: string;
}) {
  const [income, setIncome] = useState(toPounds(inputs.monthlyIncomePence));
  const [vars, setVars] = useState(
    variableTargets.map((v) => ({ ...v, value: toPounds(v.monthlyTargetPence) }))
  );
  const [pending, start] = useTransition();

  const monthlyVariablePence = vars.reduce(
    (a, v) => a + toPence(v.value),
    0
  );
  const monthlyIncomePence = toPence(income);

  const result = useMemo(
    () =>
      computeOutlook({
        ...inputs,
        monthlyIncomePence,
        monthlyVariablePence,
      }),
    [inputs, monthlyIncomePence, monthlyVariablePence]
  );

  function saveVar(id: string, value: string) {
    const target = variableTargets.find((v) => v.id === id);
    const pence = toPence(value);
    if (!target || pence === target.monthlyTargetPence) return;
    start(async () => {
      try {
        await updateBudgetMonthly(id, pence);
        toast.success(`${target.category} budget updated`);
      } catch {
        toast.error("Could not save - try again");
      }
    });
  }

  function saveIncome() {
    const pence = toPence(income);
    start(async () => {
      try {
        await setProjectedIncome(pence);
        toast.success("Projected income updated");
      } catch {
        toast.error("Could not save income");
      }
    });
  }

  function resetIncome() {
    setIncome(toPounds(historicalIncomePence));
    start(async () => {
      try {
        await setProjectedIncome(null);
        toast.success("Income reset to the historical average");
      } catch {
        toast.error("Could not reset income");
      }
    });
  }

  return (
    <div className="space-y-6">
      <OutlookBar
        result={result}
        goalName={goalName}
        goalDate={goalDate}
        monthsRemaining={inputs.monthsRemaining}
      />

      <div className="space-y-2 border-t pt-4">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Projected monthly income (£)</Label>
            <Input
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              onBlur={saveIncome}
              disabled={pending}
              inputMode="decimal"
              className="h-9 w-40 tabular-nums"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetIncome}
            disabled={pending}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Use average ({formatPence(historicalIncomePence)})
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Variable budgets (monthly £)</p>
        <p className="text-xs text-muted-foreground">
          Adjust a category to see the effect on the projection above.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {vars.map((v, idx) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <span className="text-sm font-medium">{v.category}</span>
              <Input
                value={v.value}
                onChange={(e) => {
                  const value = e.target.value;
                  setVars((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, value } : p))
                  );
                }}
                onBlur={() => saveVar(v.id, v.value)}
                disabled={pending}
                inputMode="decimal"
                className="h-9 w-28 tabular-nums"
              />
            </div>
          ))}
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          Fixed costs, subscriptions and buffer (
          {formatPence(inputs.monthlyFixedPence)}/mo) and{" "}
          {formatPence(inputs.startingSavedPence)} already saved are held
          constant. Projection runs {inputs.monthsRemaining} month
          {inputs.monthsRemaining === 1 ? "" : "s"} to the goal date.
        </p>
      </div>
    </div>
  );
}
