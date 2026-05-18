"use client";

import { useState, useTransition } from "react";
import { Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { formatPence } from "@/lib/money";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateBudgetTarget } from "@/app/actions/budget";

type Item = {
  id: string;
  category: string;
  monthlyTargetPence: number;
  expectedDayOfMonth: number | null;
  actualPence: number;
};

export function FixedCosts({ items }: { items: Item[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cost</TableHead>
          <TableHead className="w-40">Monthly target (£)</TableHead>
          <TableHead className="text-right">This month</TableHead>
          <TableHead className="w-20 text-center">Hit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((i) => (
          <Row key={i.id} item={i} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ item }: { item: Item }) {
  const [value, setValue] = useState(
    (item.monthlyTargetPence / 100).toFixed(2)
  );
  const [pending, start] = useTransition();
  const hit = item.actualPence > 0;

  function save() {
    const pence = Math.round(Number(value) * 100);
    if (Number.isNaN(pence)) return;
    start(async () => {
      await updateBudgetTarget(item.id, pence, null);
      toast.success(`${item.category} target updated`);
    });
  }

  return (
    <TableRow>
      <TableCell className="text-sm">{item.category}</TableCell>
      <TableCell>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          disabled={pending}
          className="h-8 w-32 tabular-nums"
          inputMode="decimal"
        />
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
        {formatPence(item.actualPence)}
      </TableCell>
      <TableCell className="text-center">
        {hit ? (
          <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle className="mx-auto h-3 w-3 text-muted-foreground/40" />
        )}
      </TableCell>
    </TableRow>
  );
}
