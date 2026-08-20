import { createApiHandler } from "@/lib/api-handler";
import { exportEntityCsv } from "@/lib/import-export";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;

    const { csv, entity } = await exportEntityCsv(tenantId, key);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(entity.key)}-export.csv"`,
      },
    });
  },
  { method: "GET", requiredPermission: "entities:manage" }
);