CREATE INDEX "idx_staff_tenant_id" ON "staff" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_staff_tenant_active" ON "staff" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_appointment_tenant_start" ON "appointments" USING btree ("tenant_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_appointment_tenant_staff" ON "appointments" USING btree ("tenant_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_tenant_customer" ON "appointments" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_product_tenant_name" ON "products" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_product_tenant_sku" ON "products" USING btree ("tenant_id","sku");