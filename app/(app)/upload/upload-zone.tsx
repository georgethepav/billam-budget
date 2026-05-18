"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  previewImport,
  commitImport,
  type ImportPreview,
} from "@/app/actions/import";
import type { CsvFormat } from "@/lib/csv";

type AccountOpt = {
  id: string;
  name: string;
  sortCode: string | null;
  csvFormat: string;
};

type FileState = {
  key: string;
  filename: string;
  content: string;
  accountId: string;
  status: "parsing" | "preview" | "importing" | "done" | "error";
  preview?: ImportPreview;
  error?: string;
  result?: { imported: number; duplicates: number; uncategorised: number };
};

function formatGbp(pence: number) {
  return `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toFixed(2)}`;
}

export function UploadZone({ accounts }: { accounts: AccountOpt[] }) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultAccount =
    accounts.find((a) => a.name === "Lloyds Joint")?.id ?? accounts[0]?.id ?? "";

  const runPreview = useCallback(
    async (key: string, accountId: string, filename: string, content: string) => {
      const acc = accounts.find((a) => a.id === accountId);
      const format = (acc?.csvFormat ?? "lloyds") as CsvFormat;
      try {
        const preview = await previewImport(accountId, filename, format, content);
        setFiles((prev) =>
          prev.map((f) => {
            if (f.key !== key) return f;
            // Auto-detect account from sort code if a match exists.
            let detectedId = accountId;
            if (preview.detectedSortCode) {
              const match = accounts.find(
                (a) =>
                  a.sortCode &&
                  a.sortCode.replace(/\D/g, "") ===
                    preview.detectedSortCode!.replace(/\D/g, "")
              );
              if (match) detectedId = match.id;
            }
            return {
              ...f,
              status: "preview",
              preview,
              accountId: detectedId,
            };
          })
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.key === key
              ? { ...f, status: "error", error: "Could not parse this file." }
              : f
          )
        );
      }
    },
    [accounts]
  );

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const accepted = Array.from(fileList).filter(
        (f) => f.name.toLowerCase().endsWith(".csv") || f.type === "text/csv"
      );
      if (accepted.length === 0) {
        toast.error("Only .csv files are accepted.");
        return;
      }
      for (const file of accepted) {
        const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        const content = await file.text();
        setFiles((prev) => [
          ...prev,
          {
            key,
            filename: file.name,
            content,
            accountId: defaultAccount,
            status: "parsing",
          },
        ]);
        void runPreview(key, defaultAccount, file.name, content);
      }
    },
    [defaultAccount, runPreview]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  function changeAccount(key: string, accountId: string) {
    setFiles((prev) =>
      prev.map((f) =>
        f.key === key ? { ...f, accountId, status: "parsing" } : f
      )
    );
    const f = files.find((x) => x.key === key);
    if (f) void runPreview(key, accountId, f.filename, f.content);
  }

  async function doImport(key: string) {
    const f = files.find((x) => x.key === key);
    if (!f) return;
    const acc = accounts.find((a) => a.id === f.accountId);
    const format = (acc?.csvFormat ?? "lloyds") as CsvFormat;
    setFiles((prev) =>
      prev.map((x) => (x.key === key ? { ...x, status: "importing" } : x))
    );
    try {
      const result = await commitImport(
        f.accountId,
        f.filename,
        format,
        f.content
      );
      setFiles((prev) =>
        prev.map((x) =>
          x.key === key ? { ...x, status: "done", result } : x
        )
      );
      toast.success(
        `Imported ${result.imported} transactions (${result.duplicates} duplicates skipped).`
      );
      router.refresh();
    } catch {
      setFiles((prev) =>
        prev.map((x) =>
          x.key === key
            ? { ...x, status: "error", error: "Import failed." }
            : x
        )
      );
      toast.error("Import failed.");
    }
  }

  function dismiss(key: string) {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-muted-foreground/50"
        )}
      >
        <UploadCloud
          className={cn(
            "mb-3 h-10 w-10",
            dragging ? "text-primary" : "text-muted-foreground"
          )}
        />
        <p className="text-sm font-medium">
          {dragging ? "Drop to upload" : "Drag CSV here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Multiple files supported. Lloyds, Halifax and Monzo formats.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.map((f) => (
        <Card key={f.key}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{f.filename}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={f.accountId}
                onValueChange={(v) => changeAccount(f.key, v)}
                disabled={f.status === "importing" || f.status === "done"}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismiss(f.key)}
                className="text-muted-foreground"
              >
                Remove
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {f.status === "parsing" && (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing your data...
              </p>
            )}

            {f.status === "error" && (
              <p className="flex items-center gap-2 py-4 text-sm text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                {f.error}
              </p>
            )}

            {f.status === "done" && f.result && (
              <div className="space-y-3 py-4">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Imported {f.result.imported} new transactions.{" "}
                  {f.result.duplicates} duplicates skipped,{" "}
                  {f.result.uncategorised} uncategorised.
                </p>
                <Button
                  render={<Link href="/transactions" />}
                  size="sm"
                  variant="outline"
                >
                  View transactions
                </Button>
              </div>
            )}

            {(f.status === "preview" || f.status === "importing") &&
              f.preview && (
                <div className="space-y-4">
                  <p className="text-sm">
                    Detected{" "}
                    <span className="font-medium">{f.preview.total}</span>{" "}
                    transactions
                    {f.preview.minDate && f.preview.maxDate && (
                      <>
                        {" "}
                        from {f.preview.minDate} to {f.preview.maxDate}
                      </>
                    )}
                    .
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {f.preview.duplicateCount} already imported.{" "}
                    {f.preview.newCount} new,{" "}
                    {f.preview.uncategorisedCount} uncategorised so far.
                  </p>

                  {f.preview.errors.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      {f.preview.errors.slice(0, 5).map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                      {f.preview.errors.length > 5 && (
                        <div>
                          and {f.preview.errors.length - 5} more rows skipped
                        </div>
                      )}
                    </div>
                  )}

                  {f.preview.sample.length > 0 && (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-left">
                          <tr>
                            <th className="px-2 py-1.5">Date</th>
                            <th className="px-2 py-1.5">Description</th>
                            <th className="px-2 py-1.5 text-right">Amount</th>
                            <th className="px-2 py-1.5">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.preview.sample.map((s, i) => (
                            <tr key={i} className="border-t">
                              <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                {s.date}
                              </td>
                              <td className="max-w-[220px] truncate px-2 py-1.5">
                                {s.description}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {formatGbp(s.amountPence)}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5",
                                    s.category === "Uncategorised"
                                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                      : "bg-secondary"
                                  )}
                                >
                                  {s.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Button
                    onClick={() => doImport(f.key)}
                    disabled={
                      f.status === "importing" || f.preview.newCount === 0
                    }
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {f.status === "importing" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      `Import ${f.preview.newCount} transactions`
                    )}
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
