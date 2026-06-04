CREATE TABLE "appointment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"service_ids" text[] NOT NULL,
	"preferred_date" timestamp,
	"preferred_staff_id" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "contact_method" text DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "recurrence_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "recurrence_parent_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "preferred_contact_method" text;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointment_events_tenant_created" ON "appointment_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_waitlist_tenant_branch" ON "waitlist" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "idx_waitlist_status" ON "waitlist" USING btree ("status");