import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, leaveApprovalSchema } from "@/lib/validation";
import { assertTenantOwnership } from "@/lib/auth-utils";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [leave] = await db.select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id));

    if (!leave) {
      const error = new Error("Leave request not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, leave.tenantId);
    return apiSuccess(leave);
  },
  { method: "GET", requiredPermission: "leaves:read" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(leaveApprovalSchema, body);

    const [leave] = await db.select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id));

    if (!leave) {
      const error = new Error("Leave request not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, leave.tenantId);

    if (leave.status !== "pending") {
      const error = new Error("Leave request already processed") as any;
      error.code = "INVALID_STATE";
      throw error;
    }

    const [updated] = await db.update(leaveRequests)
      .set({
        status: validated.status,
        approvedBy: validated.status === "approved" ? userId : null,
        approvedAt: validated.status === "approved" ? new Date() : null,
        rejectionReason: validated.rejectionReason || null,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "leaves:approve" }
);
