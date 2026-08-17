import { z } from "zod";
import { db } from "@/lib/db";
import { tenantConfigs, tenantConfigVersions } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

export const CONFIG_SCHEMAS: Record<string, z.ZodType> = {
  "business.model": z.object({
    type: z.string().min(1),
    tags: z.array(z.string()).default([]),
  }),
  "business.hierarchy": z.object({
    levels: z.array(z.enum(["region", "branch", "department", "team"])).default(["branch"]),
  }),
  "permissions.scopes": z.record(
    z.string(),
    z.record(z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "STYLIST"]), z.enum(["all", "branch", "own", "none"]))
  ).default({}),
  "notifications.preferences": z.record(
    z.string(),
    z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      whatsapp: z.boolean().default(false),
      push: z.boolean().default(true),
    })
  ).default({}),
  "branding": z.object({
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    invoiceFooter: z.string().optional(),
  }).default({}),
};

export const CONFIG_DEFAULTS: Record<string, any> = {
  "business.model": { type: "salon", tags: [] },
  "business.hierarchy": { levels: ["branch"] },
  "permissions.scopes": {},
  "notifications.preferences": {},
  "branding": {},
};

export const MAX_CONFIG_VERSIONS = 50;

export function validateConfigValue(key: string, value: any): any {
  const schema = CONFIG_SCHEMAS[key];
  if (schema) {
    const result = schema.safeParse(value);
    if (!result.success) {
      const error = new Error(`Invalid configuration for "${key}": ${result.error.errors[0]?.message}`) as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    return result.data;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    const error = new Error(`Configuration for "${key}" must be a JSON object`) as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  return value;
}

export function pruneVersions(versions: { version: number }[], max = MAX_CONFIG_VERSIONS): number[] {
  if (versions.length <= max) return [];
  return versions
    .sort((a, b) => b.version - a.version)
    .slice(max)
    .map((v) => v.version);
}

export async function getTenantConfig<T = any>(tenantId: string, key: string): Promise<T> {
  const [row] = await db.select()
    .from(tenantConfigs)
    .where(and(eq(tenantConfigs.tenantId, tenantId), eq(tenantConfigs.key, key)))
    .limit(1);

  if (!row) return (CONFIG_DEFAULTS[key] ?? {}) as T;
  return row.value as T;
}

export async function getTenantConfigRaw(tenantId: string, key: string) {
  const [row] = await db.select()
    .from(tenantConfigs)
    .where(and(eq(tenantConfigs.tenantId, tenantId), eq(tenantConfigs.key, key)))
    .limit(1);
  return row ?? null;
}

export async function setTenantConfig(
  tenantId: string,
  key: string,
  value: any,
  actorId?: string,
  changeNote?: string
) {
  const validated = validateConfigValue(key, value);

  const [existing] = await db.select()
    .from(tenantConfigs)
    .where(and(eq(tenantConfigs.tenantId, tenantId), eq(tenantConfigs.key, key)))
    .limit(1);

  const nextVersion = (existing?.version ?? 0) + 1;

  if (existing) {
    await db.update(tenantConfigs)
      .set({ value: validated, version: nextVersion, updatedById: actorId, updatedAt: new Date() })
      .where(eq(tenantConfigs.id, existing.id));
  } else {
    await db.insert(tenantConfigs).values({
      tenantId,
      key,
      value: validated,
      version: nextVersion,
      updatedById: actorId,
    });
  }

  await db.insert(tenantConfigVersions).values({
    tenantId,
    key,
    version: nextVersion,
    value: validated,
    changedById: actorId,
    changeNote: changeNote ?? null,
  });

  const allVersions = await db.select({ version: tenantConfigVersions.version })
    .from(tenantConfigVersions)
    .where(and(eq(tenantConfigVersions.tenantId, tenantId), eq(tenantConfigVersions.key, key)));

  const toPrune = pruneVersions(allVersions);
  for (const version of toPrune) {
    await db.delete(tenantConfigVersions)
      .where(and(
        eq(tenantConfigVersions.tenantId, tenantId),
        eq(tenantConfigVersions.key, key),
        eq(tenantConfigVersions.version, version)
      ));
  }

  try {
    await logAudit(tenantId, actorId ?? "system", "UPDATE", "TENANT_CONFIG", key, {
      version: nextVersion,
      note: changeNote,
    });
  } catch {}

  return { key, version: nextVersion, value: validated };
}

export async function getConfigVersions(tenantId: string, key: string, limit = 50) {
  return db.select()
    .from(tenantConfigVersions)
    .where(and(eq(tenantConfigVersions.tenantId, tenantId), eq(tenantConfigVersions.key, key)))
    .orderBy(desc(tenantConfigVersions.version))
    .limit(limit);
}

export async function rollbackConfig(tenantId: string, key: string, toVersion: number, actorId?: string) {
  const [target] = await db.select()
    .from(tenantConfigVersions)
    .where(and(
      eq(tenantConfigVersions.tenantId, tenantId),
      eq(tenantConfigVersions.key, key),
      eq(tenantConfigVersions.version, toVersion)
    ))
    .limit(1);

  if (!target) {
    const error = new Error(`Configuration version ${toVersion} not found for "${key}"`) as any;
    error.code = "NOT_FOUND";
    throw error;
  }

  return setTenantConfig(tenantId, key, target.value, actorId, `Rollback to version ${toVersion}`);
}