import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { validateReportConfig } from "@/lib/reports/engine";

const updateReportSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  config: z.any().optional(),
  isActive: z.boolean().optional(),
});

async function findOwnReport(tenantId: string, reportId: string) {
  const [report] = await db.select()
    .from(reports)
    .where(and(eq(reports.tenantId, tenantId), eq(reports.id, reportId)))
    .limit(1);
  return report ?? null;
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const report = await findOwnReport(tenantId, id);
    if (!report) {
      const error = new Error("Report not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess(report);
  },
  { method: "GET", requiredPermission: "reports:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateReportSchema, body);

    const existing = await findOwnReport(tenantId, id);
    if (!existing) {
      const error = new Error("Report not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const config = validated.config !== undefined ? validateReportConfig(validated.config) : existing.config;

    const [updated] = await db.update(reports)
      .set({
        name: validated.name ?? existing.name,
        description: validated.description !== undefined ? validated.description : existing.description,
        config: config as any,
        isActive: validated.isActive ?? existing.isActive,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "REPORT", updated.id, {});

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "reports:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { id } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete reports") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const existing = await findOwnReport(tenantId, id);
    if (!existing) {
      const error = new Error("Report not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(reports).where(eq(reports.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "REPORT", existing.id, {});

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "reports:manage" }
);