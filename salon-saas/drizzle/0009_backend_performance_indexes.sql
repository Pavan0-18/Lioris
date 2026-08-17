CREATE INDEX IF NOT EXISTS "idx_branches_tenant_active" ON "branches" USING btree ("tenant_id", "is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_service_categories_tenant" ON "service_categories" USING btree ("tenant_id", "is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_services_tenant_active" ON "services" USING btree ("tenant_id", "is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_services_tenant_category" ON "services" USING btree ("tenant_id", "category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_id" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_status" ON "invoices" USING btree ("tenant_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_customer" ON "invoices" USING btree ("tenant_id", "customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_created" ON "invoices" USING btree ("tenant_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refunds_tenant" ON "refunds" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refunds_invoice" ON "refunds" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tips_tenant_staff" ON "tips" USING btree ("tenant_id", "staff_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_tenant_paid" ON "payments" USING btree ("tenant_id", "paid_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_invoice" ON "payments" USING btree ("invoice_id");
