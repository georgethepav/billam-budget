# Billam Family Budget

Private household budgeting web app for the Billam family. Drag-and-drop bank
CSV import, automatic categorisation, weekly and monthly spend tracking, savings
goals and subscription auditing. Single shared password. Deployed to
budget.georgebillam.com via Vercel.

This is daily-use software, not a prototype.

## Threat model (read this)

This app stores transaction **dates, descriptions and amounts only**. It does
**not** store bank account numbers (only last 4 digits if you choose to enter
them), bank credentials, card numbers, CVVs, or anything payment-actionable.

The worst case if the password leaks: someone sees the Billam household's
spending patterns. There is no fraud risk. That is why a single shared password
is an acceptable control here. Do not add anything fraud-actionable to this app
without revisiting this decision.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui (Base UI variant)
- Postgres (Vercel Postgres or Neon) via Drizzle ORM
- Auth: single shared password, signed httpOnly JWT cookie, enforced in
  `proxy.ts` (Next 16's renamed middleware) and re-checked server-side
- Recharts for charts

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run db:push              # create the schema in your database
npm run db:seed              # load accounts, budgets, goals, rules, subs
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable             | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `DATABASE_URL`       | Postgres connection string (Vercel Postgres / Neon)  |
| `SITE_PASSWORD_HASH` | bcrypt hash of the chosen shared password            |
| `SESSION_SECRET`     | 32+ byte random string used to sign the session JWT  |

Generate the password hash:

```bash
npm run hash-password -- 'your-chosen-password'
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set all three in Vercel Project Settings -> Environment Variables for
production.

## Database

- `npm run db:generate` - generate a new SQL migration from the schema
- `npm run db:push` - push the schema directly (fastest for this single-tenant app)
- `npm run db:migrate` - apply generated migrations
- `npm run db:seed` - (re)seed reference data. Idempotent: it clears and
  reinserts budgets, goals, rules and subscriptions, and creates the two
  bank accounts only if none exist. It never deletes transactions.

## Initial data import

1. Visit budget.georgebillam.com, enter the password.
2. Go to **Upload**.
3. Drop the Lloyds CSV (2 June 2025 to 15 May 2026, ~2,327 rows) onto the drop
   zone. The account defaults to "Lloyds Joint"; it auto-detects from sort code
   if present.
4. Review the preview (detected count, date range, dedupe summary, first 10
   rows with categories) and click the green **Import** button.
5. The dashboard now shows the full historical picture.

Re-uploading the same CSV is safe: every transaction has a deduplication key of
`SHA256(date|amount_pence|description)` per account, so duplicates are skipped.

## Weekly routine

1. Log into Lloyds online banking.
2. Export the last week's transactions as CSV.
3. Drop it onto **Upload** and confirm the import.
4. Sunday evening review with Estelle on the dashboard.

### Exporting a Lloyds CSV

Internet Banking -> Your accounts -> select the account -> "Export" /
"Download" -> choose CSV / Excel -> pick the date range -> download. The
expected columns are: `Transaction Date, Transaction Type, Sort Code, Account
Number, Transaction Description, Debit Amount, Credit Amount, Balance`.

### Exporting a Halifax CSV

Halifax and Lloyds are the same banking group; the parser treats Halifax like
Lloyds and tolerates column-name variants. Online Banking -> account ->
statement/transactions -> Export -> CSV. If a real Halifax export has different
columns, adjust `parseLloydsLike`/add a Halifax branch in `lib/csv.ts` and set
the account's CSV format on the Accounts page.

## Categorisation

Transactions are categorised on import by `category_rules`, applied in priority
order (lower number wins), first case-insensitive substring match. Some rules
are direction-conditional (e.g. ESTELLE BILLAM is income on a credit, a
personal transfer on a debit). Transfers are flagged excluded from spend totals.

### Adding a rule via the UI

Transactions page -> click a row -> "Create rule from this transaction". The
pattern defaults to the merchant name. Choose a category and optionally toggle
"Apply to existing matches".

### Re-running categorisation

Settings -> Data -> "Re-run categorisation". This re-applies all rules to every
transaction that has **not** been manually categorised. Manually categorised
transactions are never overwritten.

## Changing the password

Settings -> Change password generates a new bcrypt hash and signs out the
current session. Set the new hash as `SITE_PASSWORD_HASH` in Vercel and
redeploy. (Vercel env vars cannot be rewritten at runtime, hence the manual
step.)

## Deploying to budget.georgebillam.com

1. Push the repo to GitHub (`billam-budget`) and import it into Vercel.
2. Add a Vercel Postgres (or Neon) database; copy its connection string into
   `DATABASE_URL`.
3. Set `SITE_PASSWORD_HASH` and `SESSION_SECRET`.
4. Deploy. After the first deploy, run `npm run db:push && npm run db:seed`
   locally pointed at the production `DATABASE_URL`, or via a one-off job.
5. In Vercel -> Project -> Domains, add `budget.georgebillam.com`.
6. At your DNS provider, add a CNAME record:
   `budget` -> `cname.vercel-dns.com` (Vercel will show the exact target).
   Wait for DNS propagation and Vercel to issue the TLS certificate.

## Notes

- Rate limiting on login is in-memory (5 attempts / IP / hour). It resets on
  cold start, which is acceptable for a single-tenant household app whose only
  risk is exposure of spending patterns.
- All money is stored as integer pence. Positive = credit, negative = debit.
