import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { users } from "./auth";

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, DEACTIVATE, ROLE_CHANGE, LOGIN, LOGOUT
  entityType: text("entity_type").notNull(), // STAFF, CUSTOMER, APPOINTMENT, INVOICE, etc
  entityId: text("entity_id").notNull(),
  description: text("description"), // Human-readable description
  changes: text("changes"), // JSON of {oldValue, newValue} for each field
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"), // success, failure
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("tenant_id_idx").on(table.tenantId),
  index("user_id_idx").on(table.userId),
  index("entity_type_idx").on(table.entityType),
  index("action_idx").on(table.action),
  index("created_at_idx").on(table.createdAt),
  index("tenant_created_idx").on(table.tenantId, table.createdAt),
]);
