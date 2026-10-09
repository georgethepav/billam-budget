import Link from "next/link";
import { getAllStats } from "@/lib/categorisation-stats";
import { formatPence } from "@/lib/money";
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
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Categorisation audit - Billam Family Budget",
};

export default async function CategorisationPage() {
  const { totals, byCategory, topUncat, repeated, deadRules, subs } =
    await getAllStats();

  const catPct =
    totals.total > 0
      ? ((totals.categorised / totals.total) * 100).toFixed(1)
      : "0";
  const uncatPct =
    totals.total > 0
      ? ((totals.uncategorised / totals.total) * 100).toFixed(1)
      : "0";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Categorisation audit
          </h1>
          <p className="text-sm text-muted-foreground">
            How well the rules are covering your imports.
          </p>
        </div>
        <Link
          href="/insights"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to Insights
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Transactions" value={totals.total.toLocaleString()} />
        <StatCard
          label="Categorised"
          value={`${totals.categorised.toLocaleString()} (${catPct}%)`}
          accent="good"
        />
        <StatCard
          label="Uncategorised"
          value={`${totals.uncategorised.toLocaleString()} (${uncatPct}%)`}
          accent={totals.uncategorised > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Manually set"
          value={totals.manual.toLocaleString()}
          sub={`${totals.excluded.toLocaleString()} excluded`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By category</CardTitle>
          <CardDescription>
            Count and spend by top-level category (excluded transactions
            removed).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Debit total</TableHead>
                <TableHead className="text-right">Credit total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.map((r) => (
                <TableRow key={r.category}>
                  <TableCell className="text-sm">
                    {r.category === "Uncategorised" ? (
                      <Badge variant="destructive" className="text-xs">
                        {r.category}
                      </Badge>
                    ) : (
                      r.category
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatPence(r.debitPence)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {formatPence(r.creditPence)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Subcategory breakdown (top 30 by debit)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Debit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.subcategory}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatPence(r.debitPence)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top 20 uncategorised by amount
            </CardTitle>
            <CardDescription>
              The biggest holes - highest value items that need a category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topUncat.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All transactions are categorised. Nice.
              </p>
            ) : (
              <ul className="divide-y">
                {topUncat.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {t.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayDate(t.date)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatPence(t.amountPence)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Repeated uncategorised merchants
            </CardTitle>
            <CardDescription>
              Add a rule to catch these on future uploads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repeated.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No repeated uncategorised merchants.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant (first 24 chars)</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repeated.map((r) => (
                    <TableRow key={r.prefix}>
                      <TableCell className="text-sm font-mono">
                        {r.prefix}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {r.count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatPence(r.totalPence)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dead rules</CardTitle>
          <CardDescription>
            Rules that currently match zero transactions - safe to remove or
            keep for future imports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deadRules.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Every rule matches at least one transaction.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {deadRules.map((r) => (
                <li
                  key={`${r.pattern}-${r.category}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="font-mono text-xs">{r.pattern}</span>
                  <span className="text-muted-foreground">
                    {r.category}
                    {r.subcategory ? ` / ${r.subcategory}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "good" | "warn";
}) {
  const colour =
    accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-xl tabular-nums ${colour}`}>
          {value}
        </CardTitle>
      </CardHeader>
      {sub && (
        <CardContent className="text-xs text-muted-foreground">
          {sub}
        </CardContent>
      )}
    </Card>
  );
}
