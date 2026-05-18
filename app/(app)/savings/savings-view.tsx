"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatPence, formatPenceCompact } from "@/lib/money";
import { formatDisplayDate, formatMonthLabel } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  recordSavingsTransfer,
  deleteSavingsTransfer,
} from "@/app/actions/savings";

type Transfer = {
  id: string;
  transferDate: string;
  amountPence: number;
  notes: string | null;
};

type Goal = {
  id: string;
  name: string;
  targetPence: number;
  allocatedPence: number;
  percent: number;
  complete: boolean;
  targetDate: string | null;
  priority: number;
};

export function SavingsView({
  totalSaved,
  transfers,
  goals,
}: {
  totalSaved: number;
  transfers: Transfer[];
  goals: Goal[];
}) {
  const cumulative = useMemo(() => {
    const out: { date: string; value: number }[] = [];
    transfers.reduce((acc, t) => {
      const next = acc + t.amountPence;
      out.push({
        date: formatDisplayDate(t.transferDate),
        value: next / 100,
      });
      return next;
    }, 0);
    return out;
  }, [transfers]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transfers) {
      const key = t.transferDate.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + t.amountPence);
    }
    return [...map.entries()]
      .sort()
      .map(([m, pence]) => ({
        label: formatMonthLabel(`${m}-01`),
        value: pence / 100,
      }));
  }, [transfers]);

  // Average monthly transfer rate, used for projected completion.
  const monthlyRatePence = useMemo(() => {
    if (monthly.length === 0) return 0;
    const total = transfers.reduce((a, t) => a + t.amountPence, 0);
    return total / monthly.length;
  }, [monthly, transfers]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Cumulative savings</CardTitle>
            <p className="text-xs text-muted-foreground">
              Total saved: {formatPence(totalSaved)}
            </p>
          </div>
          <RecordTransfer />
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {cumulative.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip
                    formatter={(v) => `£${Number(v ?? 0).toFixed(2)}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={3000}
                    stroke="currentColor"
                    className="text-emerald-500"
                    strokeDasharray="4 4"
                    label={{ value: "£3k", fontSize: 11, position: "right" }}
                  />
                  <ReferenceLine
                    y={5000}
                    stroke="currentColor"
                    className="text-emerald-700"
                    strokeDasharray="4 4"
                    label={{ value: "£5k", fontSize: 11, position: "right" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    className="text-primary"
                    fill="currentColor"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No transfers recorded yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip
                    formatter={(v) => `£${Number(v ?? 0).toFixed(2)}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="value"
                    className="fill-primary"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No transfers recorded yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map((g) => {
          const remaining = Math.max(0, g.targetPence - g.allocatedPence);
          const monthsToGo =
            monthlyRatePence > 0 ? remaining / monthlyRatePence : null;
          return (
            <Card
              key={g.id}
              className={g.complete ? "border-emerald-500" : ""}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{g.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Priority {g.priority}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="tabular-nums">
                    {formatPenceCompact(g.allocatedPence)} of{" "}
                    {formatPenceCompact(g.targetPence)}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(g.percent)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${g.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  {g.targetDate ? (
                    <span>Target {formatDisplayDate(g.targetDate)}</span>
                  ) : (
                    <span />
                  )}
                  {g.complete ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {g.name === "Overdraft clear"
                        ? "Overdraft cleared"
                        : "Reached"}
                    </span>
                  ) : monthsToGo != null ? (
                    <span>~{Math.ceil(monthsToGo)} months at current rate</span>
                  ) : (
                    <span>No transfer history</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[...transfers].reverse().map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              >
                <span className="text-muted-foreground">
                  {formatDisplayDate(t.transferDate)}
                </span>
                <span className="flex-1 px-3 text-xs text-muted-foreground">
                  {t.notes}
                </span>
                <span className="tabular-nums">
                  {formatPence(t.amountPence)}
                </span>
                <DeleteTransfer id={t.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecordTransfer() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        Record manual savings transfer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record savings transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Amount (£)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !amount.trim()}
            onClick={() =>
              start(async () => {
                await recordSavingsTransfer({
                  amountPence: Math.round(Number(amount) * 100),
                  transferDate: date,
                  notes: notes.trim() || null,
                });
                toast.success("Transfer recorded");
                setAmount("");
                setNotes("");
                setOpen(false);
              })
            }
          >
            Record transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTransfer({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="ml-2 h-7 w-7 text-muted-foreground"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteSavingsTransfer(id);
          toast.success("Transfer deleted");
        })
      }
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
