"use client";

import { useState, useTransition } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { formatPence } from "@/lib/money";
import { formatMonthLabel } from "@/lib/dates";
import { spendStatus, STATUS_TEXT } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBudgetTarget } from "@/app/actions/budget";

type Item = {
  id: string;
  category: string;
  monthlyTargetPence: number;
  weeklyTargetPence: number | null;
  monthSpentPence: number;
  weekSpentPence: number;
  series: { month: string; pence: number }[];
};

export function VariableSpend({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <VariableCard key={i.id} item={i} />
      ))}
    </div>
  );
}

function VariableCard({ item }: { item: Item }) {
  const [monthly, setMonthly] = useState(
    (item.monthlyTargetPence / 100).toFixed(2)
  );
  const [weekly, setWeekly] = useState(
    item.weeklyTargetPence != null
      ? (item.weeklyTargetPence / 100).toFixed(2)
      : ""
  );
  const [pending, start] = useTransition();

  const monthStatus = spendStatus(item.monthSpentPence, item.monthlyTargetPence);
  const weekStatus = item.weeklyTargetPence
    ? spendStatus(item.weekSpentPence, item.weeklyTargetPence)
    : "good";

  function save() {
    const m = Math.round(Number(monthly) * 100);
    const w = weekly.trim() ? Math.round(Number(weekly) * 100) : null;
    if (Number.isNaN(m)) return;
    start(async () => {
      await updateBudgetTarget(item.id, m, w);
      toast.success(`${item.category} targets updated`);
    });
  }

  const chartData = item.series.map((s) => ({
    label: formatMonthLabel(`${s.month}-01`),
    value: s.pence / 100,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{item.category}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">This month</span>
            <span className={cn("tabular-nums", STATUS_TEXT[monthStatus])}>
              {formatPence(item.monthSpentPence)} /{" "}
              {formatPence(item.monthlyTargetPence)}
            </span>
          </div>
          {item.weeklyTargetPence != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">This week</span>
              <span className={cn("tabular-nums", STATUS_TEXT[weekStatus])}>
                {formatPence(item.weekSpentPence)} /{" "}
                {formatPence(item.weeklyTargetPence)}
              </span>
            </div>
          )}
        </div>

        <div className="h-20">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="label" hide />
                <Tooltip
                  formatter={(v) => `£${Number(v ?? 0).toFixed(2)}`}
                  labelClassName="text-xs"
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Not enough history yet
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Monthly (£)</Label>
            <Input
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              onBlur={save}
              disabled={pending}
              className="h-8 tabular-nums"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Weekly (£)</Label>
            <Input
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
              onBlur={save}
              disabled={pending}
              placeholder="-"
              className="h-8 tabular-nums"
              inputMode="decimal"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
