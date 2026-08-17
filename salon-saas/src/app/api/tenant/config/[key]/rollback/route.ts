import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { rollbackConfig } from "@/lib/config/engine";

const rollbackSchema = z.object({
  version: z.number().int().min(1),
});

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { key } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(rollbackSchema, body);

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can roll back configuration") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const result = await rollbackConfig(tenantId, key, validated.version, userId);
    return apiSuccess(result);
  },
  { method: "POST", requiredPermission: "config:manage" }
);