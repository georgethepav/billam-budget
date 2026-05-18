"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTransactionCategory } from "@/app/actions/transactions";

export function CategorySelect({
  id,
  value,
  options,
}: {
  id: string;
  value: string | null;
  options: string[];
}) {
  const [current, setCurrent] = useState(value ?? "Uncategorised");
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await updateTransactionCategory(id, next, null);
        toast.success(`Categorised as ${next}`);
      } catch {
        setCurrent(previous);
        toast.error("Could not update category");
      }
    });
  }

  return (
    <Select value={current} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
