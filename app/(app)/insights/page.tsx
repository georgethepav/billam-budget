import {
  getInsightsComparison,
  getTopSpendsThisWeek,
  getSubscriptions,
  getAppleBills,
} from "@/lib/queries";
import { formatPence } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { AppleTimeline } from "./apple-timeline";

export const metadata = { title: "Insights - Billam Family Budget" };

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0)
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const diff = now - prev;
  if (Math.abs(diff) < 100)
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const up = diff > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs tabular-nums",
        up
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {up ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {formatPence(Math.abs(diff))}
    </span>
  );
}

export default async function InsightsPage() {
  const [comparison, topSpends, subs, appleBills] = await Promise.all([
    getInsightsComparison(),
    getTopSpendsThisWeek(10),
    getSubscriptions(),
    getAppleBills(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Trends, top spends and subscription audit.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            This month vs last month vs 6 month average
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">This month</TableHead>
                <TableHead className="text-right">Last month</TableHead>
                <TableHead className="text-right">6mo avg</TableHead>
                <TableHead className="text-right">vs last</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No spend data yet.
                  </TableCell>
                </TableRow>
              )}
              {comparison.map((c) => (
                <TableRow key={c.category}>
                  <TableCell className="text-sm">{c.category}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatPence(c.thisMonth)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {formatPence(c.lastMonth)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {formatPence(c.sixMonthAvg)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Delta now={c.thisMonth} prev={c.lastMonth} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 spends this week</CardTitle>
          </CardHeader>
          <CardContent>
            {topSpends.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No spend this week.
              </p>
            ) : (
              <Table>
                <TableBody>
                  {topSpends.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDisplayDate(t.transactionDate)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {t.description}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatPence(t.amountPence)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription audit</CardTitle>
            <CardDescription>
              Manage statuses on the Budget page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              >
                <div>
                  <p>{s.name}</p>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground">{s.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    {formatPence(s.monthlyCostPence)}
                  </span>
                  <Badge
                    variant={
                      s.status === "active"
                        ? "default"
                        : s.status === "review"
                          ? "destructive"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {s.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apple bills timeline</CardTitle>
          <CardDescription>
            All APPLE.COM/BILL charges over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppleTimeline
            data={appleBills.map((b) => ({
              date: b.transactionDate,
              amount: Math.abs(b.amountPence) / 100,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
