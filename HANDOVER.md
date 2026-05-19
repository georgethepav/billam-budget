# Billam Family Budget — Handover / Working Notes

Last updated: 2026-05-19. Read this first when resuming. It captures what
was built, the decisions behind it, and the non-obvious gotchas that will
bite if forgotten.

---

## 1. What this app is

Private single-household budgeting app (Next.js 16 App Router, Drizzle ORM,
Postgres on Neon, deployed on Vercel). One shared password. Money is stored
in **pence** everywhere. Bank data imported from CSV or PDF statements; no
bank credentials stored.

- **DB:** Neon Postgres, region **eu-central-1 (Frankfurt)**.
- **Hosting:** Vercel, pinned to **`fra1`** (see `vercel.json`) to sit next
  to Neon.
- **Repo:** `github.com/georgethepav/billam-budget`, branch `main`,
  auto-deploys on push.
- **Important:** `AGENTS.md` says this Next.js has breaking changes vs
  training data — always check `node_modules/next/dist/docs/` before
  writing framework code. This has already bitten us (see gotchas).

---

## 2. Work completed this session (newest first)

| Commit | Summary |
|--------|---------|
| `365ceab` | Cache-version key so logic changes bust the data cache on deploy |
| `11a812c` | Budget week changed to **Tuesday→Monday** |
| `46bcfe9` | Dashboard **"This week"** card (spend so far + what's left) |
| `51ada38` | Bundle pdfjs worker into the serverless function |
| `f75158e` | PDF import runtime fixes (serverExternalPackages, body limit) |
| `ec0a6e2` | **Halifax PDF statement import** + cross-source dedup |
| `c24221f` | Performance: Frankfurt region, query consolidation, data cache |
| `0449d3d` | **Holiday 2026 fund** (ring-fenced, own category + bar segment) |
| `d60ab08` | Outlook bar split by group + **Planned/summer payments** |
| `996fbfa` | **Outlook projection** page (iCloud-style bar + live what-if) |
| `530f72b` | `loading.tsx` so navigation gives instant feedback |
| `a098965` | Dashboard focuses on last week (household uploads prior week) |
| `3e0cce1` | Dashboard hub layout (health ring + collapsible cards) |
| `5ad500e` | Renamed joint account Lloyds → **Halifax** (it's a Halifax export) |

### Feature detail

**Dashboard (`app/(app)/page.tsx`)** — phone-first hub:
- Weekly **health ring** (last complete week's Eating Out + Groceries vs
  weekly target; green/amber/red) + compact Halifax / Savings / Net.
- Alerts banner (overspend / stale upload / low balance).
- Collapsible **HubCard**s: Sort uncategorised (auto-opens with a backlog),
  Headlines (biggest spends + overspends last week, 2-col grid),
  **This week**, Last week, The month, Savings goals, Recent transactions.
- "This week" card (`components/this-week.tsx`): for each weekly-tracked
  item shows **£ left to spend before the week ends Monday** (or £ over),
  a bar, and "£spent of £target so far", plus days left.

**Outlook (`app/(app)/outlook/page.tsx`, `/budget` shows a read-only bar)**
- Projects money by **2026-12-20** (`OUTLOOK_GOAL_DATE`) if budget holds.
- `lib/outlook.ts` `computeOutlook()` is the **pure** maths shared by
  server render and the client what-if. Returns projected saved, spent
  total, goal progress, and **segments** for the stacked bar.
- iCloud-style horizontal bar: green Saved slice + a coloured slice per
  spend group (Fixed, Subscriptions, each Variable category, Buffer,
  **Holiday 2026**, **Planned payments**). Legend lists each.
- Live **what-if** (`components/outlook-whatif.tsx`): edit income,
  each variable budget, planned payments, and the Holiday fund; the bar
  recomputes instantly; changes persist via server actions.
- **Income**: historical average of `Income` transactions, with a
  persisted override (setting). "Use average" resets it.
- **Planned & summer payments**: `planned_payments` table; one-off costs
  (name, amount, month). Counted against the projection only if the month
  is within the window. Editable list.
- **Holiday 2026 fund**: editable amount (default £2,000, a setting,
  `lib/settings.ts` `getHolidayFundPence`). `HOLIDAY_2026` ("Holiday
  2026") is a real transaction category — categorise spend to it. The
  projection reserves the **unspent remainder** (fund − already-spent) so
  past holiday spend isn't double-counted. Bar shows reserve; UI shows
  "£X spent · £Y remaining". Excludes the Australia trip (that's the
  separate "Melbourne accommodation" savings goal).

**Imports (`app/actions/import.ts`, `lib/csv.ts`, `lib/pdf.ts`)**
- CSV (Lloyds/Halifax/Monzo) and **Halifax PDF statements** both supported
  from the Upload page. PDF is sent base64; `lib/pdf.ts` uses `pdfjs-dist`
  to reconstruct the positioned table by x/y coordinates and bucket the
  money columns by x against the header labels. Output is the same
  `ParsedRow`/`externalId` shape as CSV.
- **Dedup** (`dedupe()` in import.ts): a row is a duplicate if its exact
  `externalId` (sha256 of `date|amountPence|description`) already exists,
  **or** an existing transaction has the same date+amount even if the
  description differs (greedy 1:1). This stops CSV↔PDF doubles when the
  same txn is worded differently in each source.
- Parser validated exactly against `Statement_2026_5.pdf`: 119 rows,
  credits £1,677.96, debits £3,590.27 = the statement's stated totals.

**Performance**
- `vercel.json` → `fra1` (co-located with Neon): ~200ms→~5ms per query.
- Per-category sequential loops collapsed into single `GROUP BY` queries
  in `lib/queries.ts` (dashboard ~25→~8 round trips; insights 30+→3).
- **Data cache**: pages import `lib/queries-cached.ts` (a facade wrapping
  heavy reads in `unstable_cache`, shared `household` tag, 300s window).
  `queries.ts` itself is raw/untouched. Every mutating server action calls
  `revalidateHousehold()` → `updateTag("household")` for
  read-your-own-writes.

---

## 3. Gotchas — read before changing anything

1. **CACHE VERSION DISCIPLINE (most important).**
   `lib/cache.ts` has `CACHE_VERSION` (currently **`v3`**). The Next data
   cache persists across deployments and its key is the query fn + args —
   **not** helper logic inside it (e.g. week boundaries, projection
   maths). If you change any calculation/query logic, **bump
   `CACHE_VERSION`** or the deployed app keeps serving stale values for
   up to 300s / until a mutation. This already caused "week still shows
   Mon–Sun after redeploy". Bump it; leave a one-line note of why.

2. **Database migrations are gated and `drizzle-kit migrate` hangs on
   Neon's pooler.** Use the working scripts instead:
   - New migration: edit `db/schema.ts` → `npx drizzle-kit generate
     --name <x>` → review SQL in `drizzle/`.
   - Apply: `npm run db:migrate` is unreliable (hangs). Use
     `scripts/migrate.ts` (`npx tsx --env-file=.env.local
     scripts/migrate.ts`) — official migrator with the postgres-js
     settings that work against Neon. The migration journal is already
     consistent (`scripts/repair-and-migrate.ts` backfilled 0000).
   - Applying to prod DB may be blocked by the safety classifier; if so,
     the user runs it via the `!` prefix.
   - Migrations applied so far: `0000` initial, `0001` app_settings,
     `0002` planned_payments.

3. **pdfjs on Vercel.** Requires all three, already in place — don't
   remove: `serverExternalPackages: ["pdfjs-dist"]`,
   `outputFileTracingIncludes` for `pdf.worker.mjs`, and
   `serverActions.bodySizeLimit: "10mb"` in `next.config.ts`; plus the
   `Promise.withResolvers` polyfill at the top of `lib/pdf.ts`. Text
   extraction only — fonts/canvas disabled (that's what breaks
   serverless).

4. **Week = Tuesday→Monday** (`lib/dates.ts`, `WEEK_OPTS.weekStartsOn:
   2`). One anchor drives health ring, alerts, last/this-week cards,
   budget tracker, `daysLeftInWeek`. date-fns: 0=Sun…2=Tue.

5. **`*.pdf` is gitignored** — personal bank statements must never be
   committed. `Statement_2026_5.pdf` is the local test fixture for
   `scripts/pdf-validate.ts`.

6. **Two query modules.** Pages import `@/lib/queries-cached` (cached
   facade). `@/lib/queries` is the raw layer. Add new reads to
   `queries.ts`, then expose via the facade (cached) or pass-through
   (e.g. `getTransactionsPage` is NOT cached — it's filter/search
   dependent).

7. **Deploys stack.** Rapid pushes queue on Vercel Hobby; the newest
   commit supersedes earlier ones — cancel queued older deploys if
   waiting.

---

## 4. Routine commands

```bash
# verify before every push
npx tsc --noEmit && npx eslint <changed files> && npx next build

# validate the PDF parser against the test statement
npx tsx scripts/pdf-validate.ts        # expect 119 rows, £1,677.96 / £3,590.27

# apply pending DB migrations (reliable path)
npx tsx --env-file=.env.local scripts/migrate.ts
```

Deploy = commit + `git push origin main` (auto-deploys). End commit
messages with the Co-Authored-By trailer.

---

## 5. Known gaps / possible next steps

- **Weekly-tracked categories**: only Eating Out & Groceries have weekly
  targets, so only they appear on This/Last week cards. To track more,
  set weekly targets on Budget → Variable Spend (they'll appear
  automatically) — or decide on pro-rata weekly slices for all variable
  categories.
- **PDF cross-dedup edge**: two genuine same-day, same-amount txns where
  one source shows only one → the second may be treated as a dupe (user
  accepted this risk).
- **Income lever**: the Dec projection is sensitive to the historical
  income average. If a future statement skews it, set a manual figure on
  /outlook.
- Planned payments are deducted as a lump from the end pot, not modelled
  as month-by-month cashflow (no "does month X go negative?" view).
- `.claude/settings.local.json` is gitignored & untracked (per-machine).

---

## 6. Key files map

- `lib/dates.ts` — week/month/goal date logic. `WEEK_OPTS` = the week
  anchor. `OUTLOOK_GOAL_DATE`, `monthsUntilGoal`, `daysLeftInWeek`.
- `lib/cache.ts` — `cached()` wrapper, `CACHE_VERSION`,
  `revalidateHousehold()`.
- `lib/queries.ts` / `lib/queries-cached.ts` — raw vs cached reads.
- `lib/outlook.ts` — pure projection maths + bar segments.
- `lib/csv.ts` / `lib/pdf.ts` — parsers, shared `externalId`.
- `lib/settings.ts` — key/value settings (income override, holiday fund).
- `app/actions/*.ts` — mutations; each calls `revalidateHousehold()`.
- `components/dashboard-hub.tsx` — `HealthRing`, collapsible `HubCard`.
- `components/outlook-bar.tsx` / `outlook-whatif.tsx` — projection UI.
- `components/this-week.tsx` — current-week remaining card.
- `scripts/migrate.ts` / `repair-and-migrate.ts` — migration runners.
- `next.config.ts` — pdfjs externalisation, worker tracing, body limit.
- `vercel.json` — region pin (`fra1`).
