import {
  getBudgetTargets,
  getSubscriptions,
  getBudgetActualsThisMonth,
  getWeeklyTracker,
  getMonthlyCategorySpend,
  getCategoryMonthlySeries,
  getAppleBillGroups,
  VARIABLE_CATEGORIES,
} from "@/lib/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FixedCosts } from "./fixed-costs";
import { SubscriptionsTab } from "./subscriptions-tab";
import { VariableSpend } from "./variable-spend";

export const metadata = { title: "Budget - Billam Family Budget" };

export default async function BudgetPage() {
  const [targets, subs, actuals, weekly, monthly, appleGroups] =
    await Promise.all([
      getBudgetTargets(),
      getSubscriptions(),
      getBudgetActualsThisMonth(),
      getWeeklyTracker("this"),
      getMonthlyCategorySpend(),
      getAppleBillGroups(),
    ]);

  const fixed = targets.filter((t) => t.type === "fixed");
  const variable = targets.filter((t) => t.type === "variable");

  const series: Record<string, { month: string; pence: number }[]> = {};
  for (const cat of VARIABLE_CATEGORIES) {
    series[cat] = await getCategoryMonthlySeries(cat, 6);
  }

  const actualsObj: Record<string, number> = {};
  for (const [k, v] of actuals) actualsObj[k] = v;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">
          Fixed costs, subscriptions and variable spend targets.
        </p>
      </header>

      <Tabs defaultValue="fixed">
        <TabsList>
          <TabsTrigger value="fixed">Fixed Costs</TabsTrigger>
          <TabsTrigger value="subs">Subscriptions</TabsTrigger>
          <TabsTrigger value="variable">Variable Spend</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fixed costs</CardTitle>
            </CardHeader>
            <CardContent>
              <FixedCosts
                items={fixed.map((t) => ({
                  id: t.id,
                  category: t.category,
                  monthlyTargetPence: t.monthlyTargetPence,
                  expectedDayOfMonth: t.expectedDayOfMonth,
                  actualPence: actualsObj[t.category] ?? 0,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subs" className="mt-4">
          <SubscriptionsTab
            subs={subs}
            appleGroups={appleGroups}
          />
        </TabsContent>

        <TabsContent value="variable" className="mt-4">
          <VariableSpend
            items={variable.map((t) => {
              const m = monthly.items.find((x) => x.category === t.category);
              const w = weekly.items.find((x) => x.category === t.category);
              return {
                id: t.id,
                category: t.category,
                monthlyTargetPence: t.monthlyTargetPence,
                weeklyTargetPence: t.weeklyTargetPence,
                monthSpentPence: m?.spentPence ?? 0,
                weekSpentPence: w?.spentPence ?? 0,
                series: series[t.category] ?? [],
              };
            })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
