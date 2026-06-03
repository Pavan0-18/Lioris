import { pgTable, text, real, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const features = pgTable("features", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").$type<"core" | "add-on" | "premium">().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: real("base_price").notNull(),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(true),
  trialDays: integer("trial_days").notNull().default(14),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const planFeatures = pgTable("plan_features", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  featureId: text("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  limit: integer("limit"),
  limitKey: text("limit_key"),
}, (table: any) => [
  uniqueIndex("plan_feature_idx").on(table.planId, table.featureId),
]);

export const superAdmins = pgTable("super_admins", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const systemConfig = pgTable("system_config", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  defaultTrialDays: integer("default_trial_days").notNull().default(14),
  defaultCurrency: text("default_currency").notNull().default("INR"),
  defaultCountry: text("default_country").notNull().default("IN"),
  defaultTimezone: text("default_timezone").notNull().default("Asia/Kolkata"),
  defaultPlanId: text("default_plan_id").references(() => plans.id),
  allowPublicSignup: boolean("allow_public_signup").notNull().default(true),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
