import {
  getOutlookModel,
  getAverageVariableSpendPerMonth,
} from "@/lib/queries-cached";
import { computeOutlook, type OutlookInputs } from "@/lib/outlook";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OutlookWhatIf } from "@/components/outlook-whatif";
import { OutlookComparison } from "@/components/outlook-comparison";

export const metadata = { title: "Outlook - Billam Family Budget" };

export default async function OutlookPage() {
  const [model, avgSpend] = await Promise.all([
    getOutlookModel(),
    getAverageVariableSpendPerMonth(3),
  ]);

  // Build the "current pace" inputs: same income/fixed/subs/buffer/planned/
  // holiday, but variable budgets replaced by each category's 3-month actual
  // average. If a category has no recent spend, fall back to the budget so
  // the comparison stays apples-to-apples.
  const actualsInputs: OutlookInputs = {
    ...model.inputs,
    variable: model.inputs.variable.map((v) => ({
      category: v.category,
      monthlyPence: avgSpend.get(v.category) ?? v.monthlyPence,
    })),
  };
  const actualsResult = computeOutlook(actualsInputs);

  const budgetedVariableMonthly = model.inputs.variable.reduce(
    (a, v) => a + v.monthlyPence,
    0
  );
  const actualsVariableMonthly = actualsInputs.variable.reduce(
    (a, v) => a + v.monthlyPence,
    0
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Outlook
        </h1>
        <p className="text-sm text-muted-foreground">
          Where the money lands by the goal date if we stick to budget - and
          what changes if we don&apos;t.
        </p>
      </header>

      <OutlookComparison
        budgeted={model.result}
        actuals={actualsResult}
        goalName={model.goalName}
        goalDate={model.goalDate}
        monthsRemaining={model.inputs.monthsRemaining}
        budgetedVariableMonthlyPence={budgetedVariableMonthly}
        actualsVariableMonthlyPence={actualsVariableMonthly}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What-if</CardTitle>
          <CardDescription>
            Live edit of income, variable budgets and planned payments.
            Starts from the budgeted projection above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OutlookWhatIf
            inputs={model.inputs}
            variableTargets={model.variableTargets}
            plannedPayments={model.plannedPayments}
            historicalIncomePence={model.historicalIncomePence}
            goalName={model.goalName}
            goalDate={model.goalDate}
            todayIso={model.todayIso}
          />
        </CardContent>
      </Card>
    </div>
  );
}
