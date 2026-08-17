CREATE TABLE IF NOT EXISTS "modules" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'operations',
  "version" text NOT NULL DEFAULT '1.0.0',
  "icon" text,
  "is_system" boolean NOT NULL DEFAULT false,
  "global_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_modules" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "module_key" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "config" jsonb,
  "enabled_at" timestamp,
  "disabled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_module_idx" ON "tenant_modules" ("tenant_id","module_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_module_tenant_idx" ON "tenant_modules" ("tenant_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_configs" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "updated_by_id" text REFERENCES "users"("id"),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_config_key_idx" ON "tenant_configs" ("tenant_id","key");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_config_versions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "key" text NOT NULL,
  "version" integer NOT NULL,
  "value" jsonb NOT NULL,
  "changed_by_id" text REFERENCES "users"("id"),
  "change_note" text,
  "changed_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_config_version_idx" ON "tenant_config_versions" ("tenant_id","key","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_config_version_lookup_idx" ON "tenant_config_versions" ("tenant_id","key");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "singular" text NOT NULL,
  "description" text,
  "icon" text,
  "module_key" text NOT NULL DEFAULT 'custom',
  "is_system" boolean NOT NULL DEFAULT false,
  "config" jsonb,
  "created_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entity_tenant_key_idx" ON "entities" ("tenant_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_tenant_idx" ON "entities" ("tenant_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_fields" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "entity_id" text NOT NULL REFERENCES "entities"("id") ON DELETE cascade,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "type" text NOT NULL DEFAULT 'text',
  "required" boolean NOT NULL DEFAULT false,
  "unique" boolean NOT NULL DEFAULT false,
  "options" jsonb,
  "default_value" text,
  "placeholder" text,
  "position" integer NOT NULL DEFAULT 0,
  "is_system" boolean NOT NULL DEFAULT false,
  "config" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entity_field_key_idx" ON "entity_fields" ("entity_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_field_tenant_idx" ON "entity_fields" ("tenant_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_records" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "entity_id" text NOT NULL REFERENCES "entities"("id") ON DELETE cascade,
  "field_values" jsonb NOT NULL DEFAULT '{}',
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_record_tenant_idx" ON "entity_records" ("tenant_id","entity_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "entity_key" text,
  "trigger_type" text NOT NULL DEFAULT 'record.created',
  "trigger_config" jsonb,
  "conditions" jsonb,
  "actions" jsonb NOT NULL DEFAULT '[]',
  "is_active" boolean NOT NULL DEFAULT true,
  "version" integer NOT NULL DEFAULT 1,
  "run_count" integer NOT NULL DEFAULT 0,
  "last_run_at" timestamp,
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_tenant_key_idx" ON "workflows" ("tenant_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_tenant_active_idx" ON "workflows" ("tenant_id","is_active");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "workflow_id" text NOT NULL REFERENCES "workflows"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "entity_key" text,
  "record_id" text,
  "status" text NOT NULL DEFAULT 'success',
  "error" text,
  "actions_executed" integer NOT NULL DEFAULT 0,
  "duration_ms" integer,
  "triggered_by_id" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_run_tenant_idx" ON "workflow_runs" ("tenant_id","workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_run_lookup_idx" ON "workflow_runs" ("tenant_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "workflow_id" text REFERENCES "workflows"("id") ON DELETE set null,
  "url" text NOT NULL,
  "payload" jsonb,
  "status" text NOT NULL DEFAULT 'pending',
  "status_code" integer,
  "attempts" integer NOT NULL DEFAULT 0,
  "next_retry_at" timestamp,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_delivery_tenant_idx" ON "webhook_deliveries" ("tenant_id","status");