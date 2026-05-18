"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2, Plus } from "lucide-react";
import { formatPence } from "@/lib/money";
import { computeOutlook, type OutlookInputs } from "@/lib/outlook";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OutlookBar } from "@/components/outlook-bar";
import { updateBudgetMonthly } from "@/app/actions/budget";
import { setProjectedIncome } from "@/app/actions/settings";
import {
  addPlannedPayment,
  updatePlannedPayment,
  deletePlannedPayment,
} from "@/app/actions/outlook";

type VarTarget = { id: string; category: string; monthlyTargetPence: number };
type Planned = {
  id: string;
  name: string;
  amountPence: number;
  dueDate: string;
};

const toPence = (pounds: string) => {
  const n = Number(pounds);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const toPounds = (pence: number) => (pence / 100).toFixed(2);

// Month-first ISO dates from the current month through the goal month.
function monthOptions(todayIso: string, goalDate: string) {
  const out: { value: string; label: string }[] = [];
  const d = new Date(`${todayIso.slice(0, 7)}-01T00:00:00`);
  const end = new Date(`${goalDate.slice(0, 7)}-01T00:00:00`);
  while (d <= end) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-01`;
    out.push({
      value,
      label: d.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
    });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export function OutlookWhatIf({
  inputs,
  variableTargets,
  plannedPayments,
  historicalIncomePence,
  goalName,
  goalDate,
  todayIso,
}: {
  inputs: OutlookInputs;
  variableTargets: VarTarget[];
  plannedPayments: Planned[];
  historicalIncomePence: number;
  goalName: string;
  goalDate: string;
  todayIso: string;
}) {
  const [income, setIncome] = useState(toPounds(inputs.monthlyIncomePence));
  const [vars, setVars] = useState(
    variableTargets.map((v) => ({ ...v, value: toPounds(v.monthlyTargetPence) }))
  );
  const [planned, setPlanned] = useState(
    plannedPayments.map((p) => ({ ...p, value: toPounds(p.amountPence) }))
  );
  const months = useMemo(
    () => monthOptions(todayIso, goalDate),
    [todayIso, goalDate]
  );
  const [draft, setDraft] = useState({
    name: "",
    value: "",
    dueDate: months[0]?.value ?? goalDate,
  });
  const [pending, start] = useTransition();

  const plannedTotalPence = planned
    .filter((p) => p.dueDate >= todayIso && p.dueDate <= goalDate)
    .reduce((a, p) => a + toPence(p.value), 0);

  const result = useMemo(
    () =>
      computeOutlook({
        ...inputs,
        monthlyIncomePence: toPence(income),
        variable: vars.map((v) => ({
          category: v.category,
          monthlyPence: toPence(v.value),
        })),
        plannedTotalPence,
      }),
    [inputs, income, vars, plannedTotalPence]
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
    start(async () => {
      try {
        await setProjectedIncome(toPence(income));
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

  function addPlanned() {
    const name = draft.name.trim();
    const pence = toPence(draft.value);
    if (!name || pence <= 0) {
      toast.error("Enter a name and a positive amount");
      return;
    }
    start(async () => {
      try {
        const id = await addPlannedPayment({
          name,
          amountPence: pence,
          dueDate: draft.dueDate,
        });
        setPlanned((prev) => [
          ...prev,
          { id, name, amountPence: pence, dueDate: draft.dueDate, value: toPounds(pence) },
        ]);
        setDraft({ name: "", value: "", dueDate: months[0]?.value ?? goalDate });
        toast.success(`${name} added`);
      } catch {
        toast.error("Could not add planned payment");
      }
    });
  }

  function savePlanned(
    id: string,
    patch: { name?: string; amountPence?: number; dueDate?: string }
  ) {
    start(async () => {
      try {
        await updatePlannedPayment(id, patch);
      } catch {
        toast.error("Could not save planned payment");
      }
    });
  }

  function removePlanned(id: string, name: string) {
    setPlanned((prev) => prev.filter((p) => p.id !== id));
    start(async () => {
      try {
        await deletePlannedPayment(id);
        toast.success(`${name} removed`);
      } catch {
        toast.error("Could not remove - refresh and retry");
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
      </div>

      <div className="space-y-3 border-t pt-4">
        <div>
          <p className="text-sm font-medium">Planned & summer payments</p>
          <p className="text-xs text-muted-foreground">
            One-off costs before the goal date (holiday, Christmas, car
            service). Each is deducted from the projected pot.
          </p>
        </div>

        <div className="space-y-2">
          {planned.length === 0 && (
            <p className="text-xs text-muted-foreground">
              None yet. Add one below.
            </p>
          )}
          {planned.map((p, idx) => {
            const inWindow = p.dueDate >= todayIso && p.dueDate <= goalDate;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-2"
              >
                <Input
                  value={p.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setPlanned((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, name } : x))
                    );
                  }}
                  onBlur={() => savePlanned(p.id, { name: p.name })}
                  disabled={pending}
                  className="h-9 min-w-0 flex-1 text-sm"
                />
                <Input
                  value={p.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPlanned((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, value } : x))
                    );
                  }}
                  onBlur={() =>
                    savePlanned(p.id, { amountPence: toPence(p.value) })
                  }
                  disabled={pending}
                  inputMode="decimal"
                  className="h-9 w-24 tabular-nums"
                />
                <Select
                  value={p.dueDate}
                  onValueChange={(dueDate) => {
                    setPlanned((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, dueDate } : x))
                    );
                    savePlanned(p.id, { dueDate });
                  }}
                >
                  <SelectTrigger className="h-9 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePlanned(p.id, p.name)}
                  disabled={pending}
                  aria-label={`Remove ${p.name}`}
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {!inWindow && (
                  <span className="w-full text-xs text-muted-foreground">
                    Outside the projection window — not counted.
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
          <Input
            placeholder="Name (e.g. Summer holiday)"
            value={draft.name}
            onChange={(e) =>
              setDraft((d) => ({ ...d, name: e.target.value }))
            }
            disabled={pending}
            className="h-9 min-w-0 flex-1 text-sm"
          />
          <Input
            placeholder="£"
            value={draft.value}
            onChange={(e) =>
              setDraft((d) => ({ ...d, value: e.target.value }))
            }
            disabled={pending}
            inputMode="decimal"
            className="h-9 w-24 tabular-nums"
          />
          <Select
            value={draft.dueDate}
            onValueChange={(dueDate) => setDraft((d) => ({ ...d, dueDate }))}
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={addPlanned}
            disabled={pending}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Fixed costs ({formatPence(inputs.monthlyFixedPence)}/mo),
        subscriptions ({formatPence(inputs.monthlySubscriptionPence)}/mo),
        buffer ({formatPence(inputs.monthlyBufferPence)}/mo) and{" "}
        {formatPence(inputs.startingSavedPence)} already saved are held
        constant. Projection runs {inputs.monthsRemaining} month
        {inputs.monthsRemaining === 1 ? "" : "s"} to {goalName}.
      </p>
    </div>
  );
}
