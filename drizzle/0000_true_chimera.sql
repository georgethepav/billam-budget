CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"csv_format" text DEFAULT 'lloyds' NOT NULL,
	"sort_code" text,
	"account_number_last4" text,
	"is_excluded_from_household_totals" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"monthly_target_pence" integer NOT NULL,
	"weekly_target_pence" integer,
	"type" text NOT NULL,
	"expected_day_of_month" integer,
	"active_from" date NOT NULL,
	"active_to" date
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"direction" text,
	"mark_excluded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csv_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"rows_total" integer NOT NULL,
	"rows_imported" integer NOT NULL,
	"rows_skipped_duplicates" integer NOT NULL,
	"rows_uncategorised" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"target_pence" integer NOT NULL,
	"current_pence" integer DEFAULT 0 NOT NULL,
	"priority" integer NOT NULL,
	"target_date" date,
	"achieved_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_date" date NOT NULL,
	"amount_pence" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"monthly_cost_pence" integer NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"last_charged" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"category" text,
	"subcategory" text,
	"is_manually_categorised" boolean DEFAULT false NOT NULL,
	"is_excluded" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_account_external" UNIQUE("account_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_account_id_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;