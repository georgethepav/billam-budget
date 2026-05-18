"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Inbox } from "lucide-react";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateTransactionCategory } from "@/app/actions/transactions";

type Row = {
  id: string;
  transactionDate: string;
  description: string;
  amountPence: number;
  accountName: string;
};

export function UncategorisedPanel({
  rows,
  total,
  days,
  options,
}: {
  rows: Row[];
  total: number;
  days: number;
  options: string[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [done, setDone] = useState(0);
  const [, start] = useTransition();

  const remaining = total - done;

  if (total === 0) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium">
            All transactions in the last {days} days are categorised.
          </p>
        </CardContent>
      </Card>
    );
  }

  function categorise(id: string, category: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    setDone((d) => d + 1);
    start(async () => {
      try {
        await updateTransactionCategory(id, category, null);
        router.refresh();
      } catch {
        toast.error("Could not categorise - refresh and retry");
      }
    });
  }

  return (
    <Card className="border-amber-400 dark:border-amber-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {remaining} uncategorised in the last {days} days
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sort these first - nothing is tracked until it has a category.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing left in this batch. Refreshing...
          </p>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDisplayDate(r.transactionDate)} - {r.accountName}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span
                  className={
                    "tabular-nums text-sm " +
                    (r.amountPence >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "")
                  }
                >
                  {formatPence(r.amountPence)}
                </span>
                <Select onValueChange={(v) => categorise(r.id, v)}>
                  <SelectTrigger className="h-9 w-[160px] text-xs">
                    <SelectValue placeholder="Categorise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
        {total > items.length + done && (
          <Button
            render={<Link href="/transactions?category=Uncategorised" />}
            nativeButton={false}
            variant="outline"
            size="sm"
            className="w-full"
          >
            View all {remaining} in Transactions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
