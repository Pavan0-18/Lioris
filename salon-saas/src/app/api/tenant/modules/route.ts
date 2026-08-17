import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import {
  getTenantModuleStates,
  setModuleEnabled,
  ensureSystemModules,
} from "@/lib/modules/service";
import { logAudit } from "@/lib/auth-utils";

const toggleSchema = z.object({
  moduleKey: z.string().min(1),
  enabled: z.boolean(),
});

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    await ensureSystemModules(tenantId);
    const modules = await getTenantModuleStates(tenantId);
    return apiSuccess(modules);
  },
  { method: "GET", requiredPermission: "modules:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const body = await req.json();
    const validated = validateBody(toggleSchema, body);

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can change modules") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const updated = await setModuleEnabled(tenantId, validated.moduleKey, validated.enabled, userId);

    await logAudit(tenantId, userId, validated.enabled ? "ENABLE" : "DISABLE", "MODULE", validated.moduleKey, {
      name: updated.name,
    });

    return apiSuccess(updated);
  },
  { method: "POST", requiredPermission: "modules:manage" }
);