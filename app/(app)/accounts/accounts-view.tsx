"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import { CSV_FORMATS } from "@/lib/csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { addAccount, deleteAccount } from "@/app/actions/accounts";

type Account = {
  id: string;
  accountName: string;
  accountType: string;
  csvFormat: string;
  sortCode: string | null;
  accountNumberLast4: string | null;
  isExcludedFromHouseholdTotals: boolean;
  transactionCount: number;
  lastImport: string | null;
};

export function AccountsView({ accounts }: { accounts: Account[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddAccountDialog />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{a.accountName}</span>
                <DeleteAccount
                  id={a.id}
                  name={a.accountName}
                  count={a.transactionCount}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{a.accountType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CSV format</span>
                <span className="capitalize">{a.csvFormat}</span>
              </div>
              {a.sortCode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sort code</span>
                  <span className="tabular-nums">{a.sortCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions</span>
                <span className="tabular-nums">{a.transactionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last upload</span>
                <span>
                  {a.lastImport
                    ? formatDisplayDate(a.lastImport)
                    : "Never"}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  render={<Link href="/upload" />}
                  nativeButton={false}
                  size="sm"
                  variant="outline"
                >
                  Upload new CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("current");
  const [format, setFormat] = useState("lloyds");
  const [sortCode, setSortCode] = useState("");
  const [last4, setLast4] = useState("");
  const [excluded, setExcluded] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 h-4 w-4" /> Add account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Account name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CSV format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CSV_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Sort code</Label>
              <Input
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                placeholder="11-12-80"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account no. last 4</Label>
              <Input
                value={last4}
                onChange={(e) => setLast4(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">
              Exclude from household totals
            </Label>
            <Switch checked={excluded} onCheckedChange={setExcluded} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !name.trim()}
            onClick={() =>
              start(async () => {
                await addAccount({
                  accountName: name.trim(),
                  accountType: type,
                  csvFormat: format,
                  sortCode: sortCode.trim() || null,
                  accountNumberLast4: last4.trim() || null,
                  isExcludedFromHouseholdTotals: excluded,
                });
                toast.success("Account added");
                setName("");
                setSortCode("");
                setLast4("");
                setOpen(false);
              })
            }
          >
            Add account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccount({
  id,
  name,
  count,
}: {
  id: string;
  name: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
          />
        }
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete the account and its {count}{" "}
          transactions. This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteAccount(id);
                toast.success(`${name} deleted`);
                setOpen(false);
              })
            }
          >
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
