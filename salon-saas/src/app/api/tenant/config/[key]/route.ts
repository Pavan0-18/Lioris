import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { getTenantConfig, setTenantConfig } from "@/lib/config/engine";

const updateSchema = z.object({
  value: z.any(),
  note: z.string().max(200).optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;
    const value = await getTenantConfig(tenantId, key);
    return apiSuccess({ key, value });
  },
  { method: "GET", requiredPermission: "config:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { key } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateSchema, body);

    if (role !== "OWNER" && role !== "MANAGER") {
      const error = new Error("Only owners and managers can update configuration") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const result = await setTenantConfig(tenantId, key, validated.value, userId, validated.note);
    return apiSuccess(result);
  },
  { method: "PUT", requiredPermission: "config:manage" }
);