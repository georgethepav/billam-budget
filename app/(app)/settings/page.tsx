import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsView } from "./settings-view";

export const metadata = { title: "Settings - Billam Family Budget" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Password, appearance, data export and maintenance.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About this app</CardTitle>
          <CardDescription>
            Private household budgeting for the Billam family.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This app stores transaction dates, descriptions and amounts only. It
          holds no bank credentials, card numbers or anything fraud-actionable.
          A single shared password is sufficient for this threat model.
        </CardContent>
      </Card>
      <SettingsView />
    </div>
  );
}
