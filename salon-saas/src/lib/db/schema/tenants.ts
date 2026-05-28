import { pgTable, text, real, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { plans, features } from "./platform";

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  country: text("country").notNull().default("IN"),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  locale: text("locale").notNull().default("en-IN"),
  taxId: text("tax_id"),
  taxLabel: text("tax_label").notNull().default("GST"),
  taxRate: real("tax_rate").notNull().default(18.0),
  logoUrl: text("logo_url"),
  planId: text("plan_id").references(() => plans.id),
  planStatus: text("plan_status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { mode: "date" }),
  cancelPolicy: text("cancel_policy"),
  invoiceFooter: text("invoice_footer"),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const tenantFeatures = pgTable("tenant_features", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  featureId: text("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  limit: integer("limit"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_feature_idx").on(table.tenantId, table.featureId),
]);

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  razorpaySubId: text("razorpay_sub_id").unique(),
  status: text("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", { mode: "date" }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
