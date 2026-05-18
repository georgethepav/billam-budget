import { getOutlookModel } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OutlookWhatIf } from "@/components/outlook-whatif";

export const metadata = { title: "Outlook - Billam Family Budget" };

export default async function OutlookPage() {
  const model = await getOutlookModel();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Outlook
        </h1>
        <p className="text-sm text-muted-foreground">
          Where the money lands by the goal date if we stick to budget — and
          what changes if we don&apos;t.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">End-of-year projection</CardTitle>
          <CardDescription>
            Saved vs spent through to {model.goalName.toLowerCase()}, with a
            live what-if on income and variable budgets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OutlookWhatIf
            inputs={model.inputs}
            variableTargets={model.variableTargets}
            historicalIncomePence={model.historicalIncomePence}
            goalName={model.goalName}
            goalDate={model.goalDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
