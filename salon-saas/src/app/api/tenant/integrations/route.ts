import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { providerConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { resolveIntegrationStatuses } from "@/lib/integrations";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;

    const rows = await db.select()
      .from(providerConfigs)
      .where(eq(providerConfigs.tenantId, tenantId));

    return apiSuccess({ integrations: resolveIntegrationStatuses(rows as any) });
  },
  { method: "GET", requiredPermission: "settings:read" }
);