import {
  getTransactionsPage,
  getAccounts,
  getCategoryOptions,
  type TxFilters,
} from "@/lib/queries";
import { poundsToPence } from "@/lib/money";
import { TransactionsView } from "./transactions-view";

export const metadata = { title: "Transactions - Billam Family Budget" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v && v.length > 0 ? v : undefined;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const minPounds = str(sp.min);
  const maxPounds = str(sp.max);

  const filters: TxFilters = {
    accountId: str(sp.account),
    category: str(sp.category),
    search: str(sp.q),
    dateFrom: str(sp.from),
    dateTo: str(sp.to),
    minPence: minPounds != null ? poundsToPence(Number(minPounds)) : undefined,
    maxPence: maxPounds != null ? poundsToPence(Number(maxPounds)) : undefined,
    page: str(sp.page) ? Number(str(sp.page)) : 1,
    pageSize: 50,
  };

  const [data, accounts, categories] = await Promise.all([
    getTransactionsPage(filters),
    getAccounts(),
    getCategoryOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          {data.total} transactions. Page {data.page} of{" "}
          {Math.max(1, data.pageCount)}.
        </p>
      </header>

      <TransactionsView
        rows={data.rows}
        total={data.total}
        page={data.page}
        pageCount={data.pageCount}
        accounts={accounts.map((a) => ({ id: a.id, name: a.accountName }))}
        categories={categories}
      />
    </div>
  );
}
