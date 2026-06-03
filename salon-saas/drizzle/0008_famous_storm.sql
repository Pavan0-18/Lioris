CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"payment_id" text,
	"amount" real NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_by" text,
	"processed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"staff_id" text,
	"amount" real NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"is_pooled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_drawer" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"opened_by" text NOT NULL,
	"closed_by" text,
	"opening_balance" real NOT NULL,
	"closing_balance" real,
	"expected_balance" real,
	"difference" real,
	"cash_sales" real DEFAULT 0,
	"card_sales" real DEFAULT 0,
	"tips_collected" real DEFAULT 0,
	"notes" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'percentage' NOT NULL,
	"value" real NOT NULL,
	"min_purchase" real DEFAULT 0,
	"max_discount" real,
	"usage_limit" integer DEFAULT 0,
	"used_count" integer DEFAULT 0 NOT NULL,
	"applies_to" text,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"package_id" text NOT NULL,
	"visits_used" integer DEFAULT 0 NOT NULL,
	"visits_remaining" integer NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"initial_balance" real NOT NULL,
	"balance" real NOT NULL,
	"sender_name" text,
	"recipient_name" text,
	"recipient_email" text,
	"message" text,
	"purchased_by_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "package_services" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"service_id" text NOT NULL,
	"included_visits" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" real NOT NULL,
	"total_visits" integer NOT NULL,
	"validity_days" integer,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_price" real,
	"recurring_interval" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_handovers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"from_staff_id" text NOT NULL,
	"to_staff_id" text,
	"notes" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"shift_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_config" ADD COLUMN "maintenance_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "system_config" ADD COLUMN "maintenance_message" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "ip_whitelist" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "custom_domain_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "deposit_amount" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "deposit_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "no_show_fee" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_drawer" ADD CONSTRAINT "cash_drawer_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_drawer" ADD CONSTRAINT "cash_drawer_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_drawer" ADD CONSTRAINT "cash_drawer_opened_by_staff_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_drawer" ADD CONSTRAINT "cash_drawer_closed_by_staff_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchased_by_id_customers_id_fk" FOREIGN KEY ("purchased_by_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_from_staff_id_staff_id_fk" FOREIGN KEY ("from_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_to_staff_id_staff_id_fk" FOREIGN KEY ("to_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_code_idx" ON "coupons" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "pkg_svc_idx" ON "package_services" USING btree ("package_id","service_id");