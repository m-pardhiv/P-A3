CREATE TYPE "public"."billing_period" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."discount_kind" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."discount_scope" AS ENUM('product', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'confirmed', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'card', 'upi', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'customer');--> statement-breakpoint
CREATE SEQUENCE "public"."invoice_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."subscription_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "billing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"as_of_date" date NOT NULL,
	"triggered_by" uuid,
	"created_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"details" jsonb,
	CONSTRAINT "billing_runs_created_check" CHECK ("billing_runs"."created_count" >= 0),
	CONSTRAINT "billing_runs_skipped_check" CHECK ("billing_runs"."skipped_count" >= 0),
	CONSTRAINT "billing_runs_error_check" CHECK ("billing_runs"."error_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "billing_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discount_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discount_redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "discount_kind" NOT NULL,
	"value" bigint NOT NULL,
	"min_purchase_amount" bigint DEFAULT 0 NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"usage_limit" integer NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"scope" "discount_scope" NOT NULL,
	"product_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discounts_value_check" CHECK ("discounts"."value" > 0),
	CONSTRAINT "discounts_percent_check" CHECK ("discounts"."kind" <> 'percent' OR "discounts"."value" <= 100),
	CONSTRAINT "discounts_min_purchase_check" CHECK ("discounts"."min_purchase_amount" >= 0),
	CONSTRAINT "discounts_min_quantity_check" CHECK ("discounts"."min_quantity" > 0),
	CONSTRAINT "discounts_dates_check" CHECK ("discounts"."end_date" >= "discounts"."start_date"),
	CONSTRAINT "discounts_used_count_check" CHECK ("discounts"."used_count" >= 0 AND "discounts"."used_count" <= "discounts"."usage_limit"),
	CONSTRAINT "discounts_product_scope_check" CHECK ("discounts"."scope" <> 'product' OR "discounts"."product_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "discounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"product_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	"tax_rate_percent" numeric(5, 2) NOT NULL,
	"tax_amount" bigint NOT NULL,
	"amount" bigint NOT NULL,
	CONSTRAINT "invoice_lines_quantity_check" CHECK ("invoice_lines"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text DEFAULT 'INV-' || lpad(nextval('invoice_number_seq')::text, 5, '0') NOT NULL,
	"subscription_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"customer_snapshot" jsonb,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"discount_total" bigint DEFAULT 0 NOT NULL,
	"tax_total" bigint DEFAULT 0 NOT NULL,
	"total" bigint DEFAULT 0 NOT NULL,
	"amount_paid" bigint DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number"),
	CONSTRAINT "invoices_period_check" CHECK ("invoices"."period_end" >= "invoices"."period_start"),
	CONSTRAINT "invoices_due_date_check" CHECK ("invoices"."due_date" >= "invoices"."issue_date"),
	CONSTRAINT "invoices_subtotal_check" CHECK ("invoices"."subtotal" >= 0),
	CONSTRAINT "invoices_discount_total_check" CHECK ("invoices"."discount_total" >= 0),
	CONSTRAINT "invoices_tax_total_check" CHECK ("invoices"."tax_total" >= 0),
	CONSTRAINT "invoices_total_check" CHECK ("invoices"."total" >= 0),
	CONSTRAINT "invoices_amount_paid_check" CHECK ("invoices"."amount_paid" >= 0 AND "invoices"."amount_paid" <= "invoices"."total")
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"days_due" integer NOT NULL,
	CONSTRAINT "payment_terms_name_unique" UNIQUE("name"),
	CONSTRAINT "payment_terms_days_due_check" CHECK ("payment_terms"."days_due" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" bigint NOT NULL,
	"paid_on" date NOT NULL,
	"note" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" bigint NOT NULL,
	"billing_period" "billing_period" NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"available_from" date,
	"available_to" date,
	"auto_close" boolean DEFAULT false NOT NULL,
	"closable" boolean DEFAULT true NOT NULL,
	"pausable" boolean DEFAULT false NOT NULL,
	"renewable" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_price_check" CHECK ("plans"."price" >= 0),
	CONSTRAINT "plans_min_quantity_check" CHECK ("plans"."min_quantity" > 0),
	CONSTRAINT "plans_availability_check" CHECK ("plans"."available_to" >= "plans"."available_from")
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"attribute" text NOT NULL,
	"value" text NOT NULL,
	"extra_price" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "product_variants_extra_price_check" CHECK ("product_variants"."extra_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sales_price" bigint NOT NULL,
	"cost_price" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sales_price_check" CHECK ("products"."sales_price" >= 0),
	CONSTRAINT "products_cost_price_check" CHECK ("products"."cost_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotation_template_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	CONSTRAINT "quotation_template_lines_quantity_check" CHECK ("quotation_template_lines"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "quotation_template_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotation_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"payment_term_id" uuid NOT NULL,
	"validity_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_templates_validity_check" CHECK ("quotation_templates"."validity_days" > 0)
);
--> statement-breakpoint
ALTER TABLE "quotation_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscription_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	"tax_rate_percent" numeric(5, 2) NOT NULL,
	"amount" bigint NOT NULL,
	CONSTRAINT "subscription_lines_quantity_check" CHECK ("subscription_lines"."quantity" > 0),
	CONSTRAINT "subscription_lines_unit_price_check" CHECK ("subscription_lines"."unit_price" >= 0),
	CONSTRAINT "subscription_lines_tax_check" CHECK ("subscription_lines"."tax_rate_percent" >= 0),
	CONSTRAINT "subscription_lines_amount_check" CHECK ("subscription_lines"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "subscription_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text DEFAULT 'SUB-' || lpad(nextval('subscription_number_seq')::text, 5, '0') NOT NULL,
	"customer_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "subscription_status" DEFAULT 'draft' NOT NULL,
	"start_date" date NOT NULL,
	"expiry_date" date,
	"next_invoice_date" date,
	"payment_term_id" uuid NOT NULL,
	"quotation_valid_until" date,
	"renewed_from_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_number_unique" UNIQUE("number"),
	CONSTRAINT "subscriptions_dates_check" CHECK ("subscriptions"."expiry_date" >= "subscriptions"."start_date")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"rate_percent" numeric(5, 2) NOT NULL,
	"product_type" text,
	"product_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tax_rules_rate_check" CHECK ("tax_rules"."rate_percent" >= 0 AND "tax_rules"."rate_percent" <= 100)
);
--> statement-breakpoint
ALTER TABLE "tax_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_template_lines" ADD CONSTRAINT "quotation_template_lines_template_id_quotation_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."quotation_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_template_lines" ADD CONSTRAINT "quotation_template_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_template_lines" ADD CONSTRAINT "quotation_template_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_template_id_quotation_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."quotation_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_renewed_from_id_subscriptions_id_fk" FOREIGN KEY ("renewed_from_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "discount_redemptions_unique_idx" ON "discount_redemptions" USING btree ("discount_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_subscription_period_idx" ON "invoices" USING btree ("subscription_id","period_start") WHERE "invoices"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "invoices_status_due_date_idx" ON "invoices" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_paid_on_idx" ON "payments" USING btree ("paid_on");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_unique_idx" ON "product_variants" USING btree ("product_id","attribute","value");--> statement-breakpoint
CREATE INDEX "quotation_template_lines_template_id_idx" ON "quotation_template_lines" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_lines_subscription_id_idx" ON "subscription_lines" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_next_invoice_date_idx" ON "subscriptions" USING btree ("next_invoice_date") WHERE "subscriptions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rules_one_default_idx" ON "tax_rules" USING btree ("is_default") WHERE "tax_rules"."is_default" AND "tax_rules"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));