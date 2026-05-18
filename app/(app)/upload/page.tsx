import {
  getAccounts,
  getRecentImports,
} from "@/lib/queries-cached";
import { formatDisplayDate } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadZone } from "./upload-zone";

export const metadata = { title: "Upload - Billam Family Budget" };

export default async function UploadPage() {
  const [accounts, imports] = await Promise.all([
    getAccounts(),
    getRecentImports(10),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Upload CSV</h1>
        <p className="text-sm text-muted-foreground">
          Drop your bank export to import new transactions.
        </p>
      </header>

      <UploadZone
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.accountName,
          sortCode: a.sortCode,
          csvFormat: a.csvFormat,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent imports</CardTitle>
          <CardDescription>Last 10 imports</CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No imports yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Duplicates</TableHead>
                  <TableHead className="text-right">Uncategorised</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDisplayDate(
                        new Date(i.importedAt).toISOString().slice(0, 10)
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {i.filename}
                    </TableCell>
                    <TableCell className="text-sm">{i.accountName}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {i.rowsImported}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {i.rowsSkippedDuplicates}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {i.rowsUncategorised}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
