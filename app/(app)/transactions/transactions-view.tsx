"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateTransactionCategory,
  toggleTransactionExcluded,
  updateTransactionNotes,
  createRuleFromTransaction,
} from "@/app/actions/transactions";

type Row = {
  id: string;
  accountId: string;
  transactionDate: string;
  description: string;
  amountPence: number;
  category: string | null;
  subcategory: string | null;
  isExcluded: boolean;
  isManuallyCategorised: boolean;
  notes: string | null;
  accountName: string;
};

const ALL = "__all__";

export function TransactionsView({
  rows,
  total,
  page,
  pageCount,
  accounts,
  categories,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageCount: number;
  accounts: { id: string; name: string }[];
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Row | null>(null);

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <>
      <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Search</Label>
          <Input
            defaultValue={params.get("q") ?? ""}
            placeholder="Description..."
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setParam("q", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account</Label>
          <Select
            value={params.get("account") ?? ALL}
            onValueChange={(v) => setParam("account", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select
            value={params.get("category") ?? ALL}
            onValueChange={(v) => setParam("category", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              defaultValue={params.get("from") ?? ""}
              className="h-9"
              onChange={(e) => setParam("from", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              defaultValue={params.get("to") ?? ""}
              className="h-9"
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => setSelected(t)}
              >
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDisplayDate(t.transactionDate)}
                </TableCell>
                <TableCell className="max-w-[260px] truncate text-sm">
                  {t.description}
                  {t.isExcluded && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      excluded
                    </Badge>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums text-sm",
                    t.amountPence >= 0 &&
                      "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatPence(t.amountPence)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t.accountName}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <InlineCategory
                    id={t.id}
                    value={t.category}
                    options={categories}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{total} total</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setParam("page", String(page + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Button
        render={<Link href="/upload" />}
        className="fixed bottom-6 right-6 z-20 h-12 rounded-full shadow-lg"
      >
        <Plus className="mr-1 h-4 w-4" /> Upload CSV
      </Button>

      <Sheet
        open={selected != null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <TransactionDrawer
              key={selected.id}
              tx={selected}
              categories={categories}
              onChange={() => startTransition(() => router.refresh())}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function InlineCategory({
  id,
  value,
  options,
}: {
  id: string;
  value: string | null;
  options: string[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "Uncategorised");
  const [pending, start] = useTransition();
  return (
    <Select
      value={current}
      disabled={pending}
      onValueChange={(v) => {
        const prev = current;
        setCurrent(v);
        start(async () => {
          try {
            await updateTransactionCategory(id, v, null);
            toast.success(`Categorised as ${v}`);
            router.refresh();
          } catch {
            setCurrent(prev);
            toast.error("Update failed");
          }
        });
      }}
    >
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

function TransactionDrawer({
  tx,
  categories,
  onChange,
}: {
  tx: Row;
  categories: string[];
  onChange: () => void;
}) {
  const [category, setCategory] = useState(tx.category ?? "Uncategorised");
  const [excluded, setExcluded] = useState(tx.isExcluded);
  const [notes, setNotes] = useState(tx.notes ?? "");
  const [showRule, setShowRule] = useState(false);
  const merchant = tx.description.split(/\s{2,}|,/)[0].trim().slice(0, 40);
  const [pattern, setPattern] = useState(merchant);
  const [ruleCategory, setRuleCategory] = useState(
    tx.category ?? "Uncategorised"
  );
  const [applyExisting, setApplyExisting] = useState(true);
  const [pending, start] = useTransition();

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-base">{tx.description}</SheetTitle>
        <SheetDescription>
          {formatDisplayDate(tx.transactionDate)} - {tx.accountName}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-8">
        <div className="rounded-md border p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span
              className={cn(
                "tabular-nums font-medium",
                tx.amountPence >= 0 && "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatPence(tx.amountPence)}
            </span>
          </div>
          {tx.subcategory && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Subcategory</span>
              <span>{tx.subcategory}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Category</Label>
          <Select
            value={category}
            disabled={pending}
            onValueChange={(v) => {
              setCategory(v);
              start(async () => {
                await updateTransactionCategory(tx.id, v, null);
                toast.success("Category updated");
                onChange();
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-normal">
            Exclude from spend totals
          </Label>
          <Switch
            checked={excluded}
            disabled={pending}
            onCheckedChange={(v) => {
              setExcluded(v);
              start(async () => {
                await toggleTransactionExcluded(tx.id, v);
                toast.success(v ? "Excluded" : "Included");
                onChange();
              });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            rows={3}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await updateTransactionNotes(tx.id, notes);
                toast.success("Note saved");
                onChange();
              })
            }
          >
            Save note
          </Button>
        </div>

        <div className="border-t pt-4">
          {!showRule ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRule(true)}
            >
              Create rule from this transaction
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Pattern (substring match)</Label>
                <Input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Category</Label>
                <Select value={ruleCategory} onValueChange={setRuleCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">
                  Apply to existing matches
                </Label>
                <Switch
                  checked={applyExisting}
                  onCheckedChange={setApplyExisting}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending || pattern.trim().length === 0}
                  onClick={() =>
                    start(async () => {
                      await createRuleFromTransaction({
                        pattern,
                        category: ruleCategory,
                        subcategory: null,
                        priority: 100,
                        applyToExisting: applyExisting,
                      });
                      toast.success("Rule created");
                      setShowRule(false);
                      onChange();
                    })
                  }
                >
                  Create rule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRule(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
