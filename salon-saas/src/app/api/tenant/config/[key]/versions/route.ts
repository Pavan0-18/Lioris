import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { getConfigVersions } from "@/lib/config/engine";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;
    const versions = await getConfigVersions(tenantId, key);
    return apiSuccess(versions);
  },
  { method: "GET", requiredPermission: "config:manage" }
);