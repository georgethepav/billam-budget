import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  unique,
} from "drizzle-orm/pg-core";

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(), // "current" | "savings"
  csvFormat: text("csv_format").default("halifax").notNull(), // "lloyds" | "halifax" | "monzo"
  sortCode: text("sort_code"),
  accountNumberLast4: text("account_number_last4"),
  isExcludedFromHouseholdTotals: boolean("is_excluded_from_household_totals")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .references(() => bankAccounts.id, { onDelete: "cascade" })
      .notNull(),
    externalId: text("external_id").notNull(),
    transactionDate: date("transaction_date").notNull(),
    description: text("description").notNull(),
    amountPence: integer("amount_pence").notNull(), // positive credit, negative debit
    category: text("category"),
    subcategory: text("subcategory"),
    isManuallyCategorised: boolean("is_manually_categorised")
      .default(false)
      .notNull(),
    isExcluded: boolean("is_excluded").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("transactions_account_external").on(t.accountId, t.externalId)]
);

export const categoryRules = pgTable("category_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  pattern: text("pattern").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  priority: integer("priority").default(100).notNull(),
  // null = match any direction, "credit" = credits only, "debit" = debits only
  direction: text("direction"),
  // when true, transactions matching this rule are excluded from spend totals
  markExcluded: boolean("mark_excluded").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const budgetTargets = pgTable("budget_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  monthlyTargetPence: integer("monthly_target_pence").notNull(),
  weeklyTargetPence: integer("weekly_target_pence"),
  type: text("type").notNull(), // "fixed" | "subscription" | "variable" | "buffer"
  expectedDayOfMonth: integer("expected_day_of_month"),
  activeFrom: date("active_from").notNull(),
  activeTo: date("active_to"),
});

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  targetPence: integer("target_pence").notNull(),
  currentPence: integer("current_pence").default(0).notNull(),
  priority: integer("priority").notNull(),
  targetDate: date("target_date"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const savingsTransfers = pgTable("savings_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferDate: date("transfer_date").notNull(),
  amountPence: integer("amount_pence").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  monthlyCostPence: integer("monthly_cost_pence").notNull(),
  status: text("status").notNull(), // "active" | "cancelled" | "review" | "audit_pending"
  notes: text("notes"),
  lastCharged: date("last_charged"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Small key/value store for app-level settings that aren't env vars and don't
// warrant their own table (e.g. the projected monthly income override).
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const csvImports = pgTable("csv_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .references(() => bankAccounts.id, { onDelete: "cascade" })
    .notNull(),
  filename: text("filename").notNull(),
  rowsTotal: integer("rows_total").notNull(),
  rowsImported: integer("rows_imported").notNull(),
  rowsSkippedDuplicates: integer("rows_skipped_duplicates").notNull(),
  rowsUncategorised: integer("rows_uncategorised").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type BudgetTarget = typeof budgetTargets.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type SavingsTransfer = typeof savingsTransfers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type CsvImport = typeof csvImports.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
