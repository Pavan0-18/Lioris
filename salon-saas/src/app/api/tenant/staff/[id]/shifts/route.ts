import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { shifts, branches, staff } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, shiftsBulkSchema } from "@/lib/validation";
import { assertTenantOwnership } from "@/lib/auth-utils";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId");

    const conditions = [eq(shifts.tenantId, tenantId)];
    if (staffId) conditions.push(eq(shifts.staffId, staffId));

    const list = await db.select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(shifts.dayOfWeek, shifts.startTime);

    return apiSuccess(list);
  },
  { method: "GET", requiredPermission: "shifts:read" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(shiftsBulkSchema, body);

    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, id));

    if (!staffRecord) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    assertTenantOwnership(tenantId, staffRecord.tenantId);

    if (validated.shifts.length > 0) {
      const branchIds = [...new Set(validated.shifts.map(s => s.branchId))];
      const validBranches = await db.select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.tenantId, tenantId), inArray(branches.id, branchIds)));
      
      const validBranchSet = new Set(validBranches.map(b => b.id));
      for (const s of validated.shifts) {
        if (!validBranchSet.has(s.branchId)) {
          const error = new Error(`Branch ${s.branchId} not found`) as any;
          error.code = "NOT_FOUND";
          throw error;
        }
      }
    }

    await db.delete(shifts).where(and(eq(shifts.staffId, id), eq(shifts.tenantId, tenantId)));

    if (validated.shifts.length > 0) {
      await db.insert(shifts).values(
        validated.shifts.map(s => ({
          tenantId,
          staffId: id,
          branchId: s.branchId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive ?? true,
          effectiveFrom: s.effectiveFrom ? new Date(s.effectiveFrom) : null,
          effectiveTo: s.effectiveTo ? new Date(s.effectiveTo) : null,
        }))
      );
    }

    return apiSuccess({ success: true });
  },
  { method: "PUT", requiredPermission: "shifts:write" }
);
