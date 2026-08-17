import { db } from "@/lib/db";
import { tenantModules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  MODULES,
  MODULE_MAP,
  getCoreModuleKeys,
  resolveModuleDependencies,
  type ModuleDefinition,
} from "./registry";

export interface TenantModuleState extends ModuleDefinition {
  enabled: boolean;
  tenantConfig: Record<string, any> | null;
  enabledAt: Date | null;
  disabledAt: Date | null;
}

const moduleCache = new Map<string, Map<string, boolean>>();

export function clearModuleCache(tenantId: string) {
  moduleCache.delete(tenantId);
}

export async function ensureSystemModules(tenantId: string) {
  const rows = await db.select({ moduleKey: tenantModules.moduleKey })
    .from(tenantModules)
    .where(eq(tenantModules.tenantId, tenantId));

  const existing = new Set(rows.map((r) => r.moduleKey));
  const missing = MODULES.filter((m) => m.defaultEnabled && !existing.has(m.key)).map((m) => m.key);

  if (missing.length > 0) {
    await db.insert(tenantModules).values(
      missing.map((moduleKey) => ({
        tenantId,
        moduleKey,
        enabled: true,
        enabledAt: new Date(),
      }))
    );
  }
}

export async function getTenantModuleStates(tenantId: string): Promise<TenantModuleState[]> {
  const rows = await db.select()
    .from(tenantModules)
    .where(eq(tenantModules.tenantId, tenantId));

  const rowMap = new Map(rows.map((r) => [r.moduleKey, r]));

  return MODULES.map((def) => {
    const row = rowMap.get(def.key);
    const enabled = def.isSystem ? true : row?.enabled ?? def.defaultEnabled;
    return {
      ...def,
      enabled,
      tenantConfig: row?.config ?? null,
      enabledAt: row?.enabledAt ?? null,
      disabledAt: row?.disabledAt ?? null,
    };
  });
}

export async function getEnabledModuleKeys(tenantId: string): Promise<string[]> {
  const cached = moduleCache.get(tenantId);
  if (cached) return [...cached.keys()].filter((k) => cached.get(k));

  const states = await getTenantModuleStates(tenantId);
  const map = new Map<string, boolean>();
  for (const s of states) map.set(s.key, s.enabled);
  moduleCache.set(tenantId, map);
  return states.filter((s) => s.enabled).map((s) => s.key);
}

export async function isModuleEnabled(tenantId: string, moduleKey: string): Promise<boolean> {
  const def = MODULE_MAP[moduleKey];
  if (!def) return false;
  if (def.isSystem) return true;
  const keys = await getEnabledModuleKeys(tenantId);
  return keys.includes(moduleKey);
}

export async function setModuleEnabled(
  tenantId: string,
  moduleKey: string,
  enabled: boolean,
  actorId?: string
): Promise<TenantModuleState> {
  const def = MODULE_MAP[moduleKey];
  if (!def) {
    const error = new Error("Module not found") as any;
    error.code = "NOT_FOUND";
    throw error;
  }
  if (def.isSystem) {
    const error = new Error("System modules cannot be disabled") as any;
    error.code = "INVALID_INPUT";
    throw error;
  }

  if (enabled) {
    const deps = resolveModuleDependencies(moduleKey).filter((k) => k !== moduleKey);
    if (deps.length > 0) {
      const current = await getEnabledModuleKeys(tenantId);
      const missing = deps.filter((d) => !current.includes(d));
      if (missing.length > 0) {
        const error = new Error(`Enable required modules first: ${missing.join(", ")}`) as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
    }
  }

  const [existing] = await db.select()
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)));

  if (existing) {
    await db.update(tenantModules)
      .set({
        enabled,
        enabledAt: enabled ? existing.enabledAt ?? new Date() : existing.enabledAt,
        disabledAt: enabled ? null : new Date(),
      })
      .where(eq(tenantModules.id, existing.id));
  } else {
    await db.insert(tenantModules).values({
      tenantId,
      moduleKey,
      enabled,
      enabledAt: enabled ? new Date() : null,
    });
  }

  clearModuleCache(tenantId);

  const states = await getTenantModuleStates(tenantId);
  const updated = states.find((s) => s.key === moduleKey)!;
  return updated;
}

export async function assertModuleEnabled(tenantId: string, moduleKey: string): Promise<void> {
  if (!(await isModuleEnabled(tenantId, moduleKey))) {
    const error = new Error(`Module "${moduleKey}" is not enabled for this workspace`) as any;
    error.code = "FORBIDDEN";
    throw error;
  }
}

export function isSystemModuleKey(key: string): boolean {
  return getCoreModuleKeys().includes(key);
}