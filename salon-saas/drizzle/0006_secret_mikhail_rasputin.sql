ALTER TABLE "tenants" ADD COLUMN "points_per_unit" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "point_value" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "max_redeem_pct" real DEFAULT 0.2 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "free_service_threshold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "loyalty_tiers" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "image_url" text;