ALTER TABLE "audit_logs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "status" text DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customer_tenant_id" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_customer_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_customer_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_customer_tenant_name" ON "customers" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_customer_tenant_phone" ON "customers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");