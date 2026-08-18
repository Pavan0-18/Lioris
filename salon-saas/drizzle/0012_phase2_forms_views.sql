CREATE TABLE IF NOT EXISTS "entity_forms" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "entity_id" text NOT NULL REFERENCES "entities"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "layout" jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_form_tenant_idx" ON "entity_forms" ("tenant_id","entity_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_views" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "entity_id" text NOT NULL REFERENCES "entities"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'list',
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_view_tenant_idx" ON "entity_views" ("tenant_id","entity_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboards" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_tenant_idx" ON "dashboards" ("tenant_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboard_widgets" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "dashboard_id" text NOT NULL REFERENCES "dashboards"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "type" text NOT NULL DEFAULT 'count',
  "entity_id" text REFERENCES "entities"("id") ON DELETE cascade,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "position" jsonb NOT NULL DEFAULT '{"x":0,"y":0,"w":4,"h":3}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_widget_tenant_idx" ON "dashboard_widgets" ("tenant_id","dashboard_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "entity_id" text NOT NULL REFERENCES "entities"("id") ON DELETE cascade,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_tenant_idx" ON "reports" ("tenant_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE cascade,
  "day_of_week" integer NOT NULL,
  "is_working" boolean NOT NULL DEFAULT true,
  "start_time" text,
  "end_time" text,
  "buffer_minutes" integer NOT NULL DEFAULT 0,
  "max_concurrent" integer NOT NULL DEFAULT 1,
  "notes" text,
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "schedule_rule_staff_day_idx" ON "schedule_rules" ("tenant_id","staff_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_rule_tenant_idx" ON "schedule_rules" ("tenant_id");
