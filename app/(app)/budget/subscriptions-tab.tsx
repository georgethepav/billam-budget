"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateSubscription,
  addSubscription,
  deleteSubscription,
} from "@/app/actions/budget";

type Sub = {
  id: string;
  name: string;
  monthlyCostPence: number;
  status: string;
  notes: string | null;
};

const STATUSES = ["active", "cancelled", "review", "audit_pending"];

export function SubscriptionsTab({
  subs,
  appleGroups,
}: {
  subs: Sub[];
  appleGroups: { amountPence: number; count: number; lastDate: string }[];
}) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");

  const total = subs
    .filter((s) => s.status === "active")
    .reduce((a, s) => a + s.monthlyCostPence, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Subscriptions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Active total: {formatPence(total)} / month
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div className="space-y-1">
              <label className="text-xs">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 w-44"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs">Monthly (£)</label>
              <Input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="h-8 w-28"
                inputMode="decimal"
              />
            </div>
            <Button
              size="sm"
              disabled={pending || !name.trim()}
              onClick={() =>
                start(async () => {
                  await addSubscription({
                    name: name.trim(),
                    monthlyCostPence: Math.round(Number(cost || "0") * 100),
                    status: "active",
                    notes: null,
                  });
                  toast.success("Subscription added");
                  setName("");
                  setCost("");
                  setAdding(false);
                })
              }
            >
              Save
            </Button>
          </div>
        )}

        {subs.map((s) => (
          <SubRow
            key={s.id}
            sub={s}
            isApple={s.name === "Apple"}
            appleGroups={appleGroups}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SubRow({
  sub,
  isApple,
  appleGroups,
}: {
  sub: Sub;
  isApple: boolean;
  appleGroups: { amountPence: number; count: number; lastDate: string }[];
}) {
  const [cost, setCost] = useState((sub.monthlyCostPence / 100).toFixed(2));
  const [notes, setNotes] = useState(sub.notes ?? "");
  const [status, setStatus] = useState(sub.status);
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-2 p-3">
        {isApple ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {sub.name}
          </button>
        ) : (
          <span className="text-sm font-medium">{sub.name}</span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onBlur={() =>
              start(async () => {
                await updateSubscription(sub.id, {
                  monthlyCostPence: Math.round(Number(cost) * 100),
                });
                toast.success("Cost updated");
              })
            }
            disabled={pending}
            className="h-8 w-24 tabular-nums"
            inputMode="decimal"
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              start(async () => {
                await updateSubscription(sub.id, { status: v });
                toast.success("Status updated");
              });
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((st) => (
                <SelectItem key={st} value={st} className="text-xs">
                  {st.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteSubscription(sub.id);
                toast.success("Deleted");
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() =>
            start(async () => {
              await updateSubscription(sub.id, { notes: notes || null });
            })
          }
          placeholder="Notes"
          className="h-8 w-full text-xs"
        />
      </div>

      {isApple && expanded && (
        <div className="border-t bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium">
            Detected APPLE.COM/BILL charges by amount
          </p>
          {appleGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No Apple charges imported yet.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1">Amount</th>
                  <th className="py-1">Times charged</th>
                  <th className="py-1">Last charged</th>
                  <th className="py-1">Label</th>
                </tr>
              </thead>
              <tbody>
                {appleGroups.map((g) => (
                  <tr key={g.amountPence} className="border-t">
                    <td className="py-1.5 tabular-nums">
                      {formatPence(g.amountPence)}
                    </td>
                    <td className="py-1.5">{g.count}</td>
                    <td className="py-1.5">
                      {formatDisplayDate(g.lastDate)}
                    </td>
                    <td className="py-1.5">
                      <Input
                        placeholder="e.g. iCloud 2TB"
                        className="h-7 w-40 text-xs"
                        defaultValue=""
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
