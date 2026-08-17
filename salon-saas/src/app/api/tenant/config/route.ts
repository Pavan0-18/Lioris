import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { CONFIG_DEFAULTS, CONFIG_SCHEMAS, getTenantConfigRaw } from "@/lib/config/engine";
import { db } from "@/lib/db";
import { tenantConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    const rows = await db.select().from(tenantConfigs).where(eq(tenantConfigs.tenantId, tenantId));

    const stored = new Map(rows.map((r) => [r.key, r]));

    const allKeys = new Set([...Object.keys(CONFIG_DEFAULTS), ...stored.keys()]);
    const configs = [...allKeys].map((key) => {
      const row = stored.get(key);
      return {
        key,
        value: row?.value ?? CONFIG_DEFAULTS[key] ?? {},
        version: row?.version ?? 0,
        schema: CONFIG_SCHEMAS[key] ? "validated" : "freeform",
        updatedAt: row?.updatedAt ?? null,
      };
    });

    return apiSuccess(configs);
  },
  { method: "GET", requiredPermission: "config:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const body = await req.json();
    const key = body?.key;
    if (!key || typeof key !== "string") {
      const error = new Error("Configuration key is required") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    const row = await getTenantConfigRaw(tenantId, key);
    return apiSuccess({
      key,
      value: row?.value ?? CONFIG_DEFAULTS[key] ?? {},
      version: row?.version ?? 0,
    });
  },
  { method: "POST", requiredPermission: "config:manage" }
);