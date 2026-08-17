ALTER TABLE "appointments" ADD COLUMN "check_in_code" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "checked_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "checked_in_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_backup_codes" text;--> statement-breakpoint
ALTER TABLE "super_admins" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "super_admins" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "super_admins" ADD COLUMN "two_factor_backup_codes" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointment_tenant_checkin" ON "appointments" USING btree ("tenant_id","check_in_code");--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "stripe_price_id" text;