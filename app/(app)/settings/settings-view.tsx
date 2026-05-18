"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changePassword,
  deleteAllTransactions,
  deleteAllData,
} from "@/app/actions/settings";
import { recategoriseAll } from "@/app/actions/transactions";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [newPw, setNewPw] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [confirmTx, setConfirmTx] = useState("");
  const [confirmAll, setConfirmAll] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generates a new bcrypt hash. Set it as the SITE_PASSWORD_HASH
            environment variable in Vercel, then redeploy. Your current session
            is signed out immediately.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (min 8 chars)"
            />
            <Button
              disabled={pending || newPw.length < 8}
              onClick={() =>
                start(async () => {
                  try {
                    const res = await changePassword(newPw);
                    setHash(res.hash);
                    setNewPw("");
                    toast.success("Hash generated. Session signed out.");
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Failed"
                    );
                  }
                })
              }
            >
              Generate
            </Button>
          </div>
          {hash && (
            <div className="space-y-1">
              <Label className="text-xs">
                New SITE_PASSWORD_HASH (copy to Vercel env)
              </Label>
              <code className="block break-all rounded-md bg-muted p-2 text-xs">
                {hash}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Export all data</p>
              <p className="text-xs text-muted-foreground">
                Download every transaction as CSV.
              </p>
            </div>
            <Button
              render={<a href="/api/export" />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Export CSV
            </Button>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <p className="text-sm">Re-run categorisation</p>
              <p className="text-xs text-muted-foreground">
                Re-applies rules to all non-manually-categorised transactions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const { updated } = await recategoriseAll();
                  toast.success(`Re-categorised ${updated} transactions`);
                })
              }
            >
              Re-run
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-300 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-base text-red-600 dark:text-red-400">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm">
              Delete all transactions and import history. Keeps budgets, goals
              and rules.
            </p>
            <div className="flex gap-2">
              <Input
                value={confirmTx}
                onChange={(e) => setConfirmTx(e.target.value)}
                placeholder="Type: DELETE TRANSACTIONS"
              />
              <Button
                variant="destructive"
                disabled={pending || confirmTx !== "DELETE TRANSACTIONS"}
                onClick={() =>
                  start(async () => {
                    try {
                      await deleteAllTransactions(confirmTx);
                      setConfirmTx("");
                      toast.success("All transactions deleted");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  })
                }
              >
                Delete
              </Button>
            </div>
          </div>
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm">
              Delete everything: transactions, budgets, goals, subscriptions,
              rules.
            </p>
            <div className="flex gap-2">
              <Input
                value={confirmAll}
                onChange={(e) => setConfirmAll(e.target.value)}
                placeholder="Type: DELETE ALL DATA"
              />
              <Button
                variant="destructive"
                disabled={pending || confirmAll !== "DELETE ALL DATA"}
                onClick={() =>
                  start(async () => {
                    try {
                      await deleteAllData(confirmAll);
                      setConfirmAll("");
                      toast.success("All data deleted");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  })
                }
              >
                Delete all
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
