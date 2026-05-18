import { getAccountStats } from "@/lib/queries";
import { AccountsView } from "./accounts-view";

export const metadata = { title: "Accounts - Billam Family Budget" };

export default async function AccountsPage() {
  const accounts = await getAccountStats();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Bank accounts and their import history.
        </p>
      </header>
      <AccountsView
        accounts={accounts.map((a) => ({
          id: a.id,
          accountName: a.accountName,
          accountType: a.accountType,
          csvFormat: a.csvFormat,
          sortCode: a.sortCode,
          accountNumberLast4: a.accountNumberLast4,
          isExcludedFromHouseholdTotals: a.isExcludedFromHouseholdTotals,
          transactionCount: a.transactionCount,
          lastImport: a.lastImport
            ? new Date(a.lastImport).toISOString().slice(0, 10)
            : null,
        }))}
      />
    </div>
  );
}
