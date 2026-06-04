import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { leaveRequests, staff, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, validateQuery, leaveRequestSchema } from "@/lib/validation";
import { z } from "zod";

const leavesQuerySchema = z.object({
  staffId: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const filters = validateQuery(leavesQuerySchema, url);

    const conditions = [eq(leaveRequests.tenantId, tenantId)];
    if (filters.staffId) conditions.push(eq(leaveRequests.staffId, filters.staffId));
    if (filters.status) conditions.push(eq(leaveRequests.status, filters.status));

    const list = await db.select()
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(...conditions))
      .orderBy(leaveRequests.createdAt);

    const mapped = list.map(l => ({
      id: l.leave_requests.id,
      staffId: l.leave_requests.staffId,
      staffName: l.users.name,
      startDate: l.leave_requests.startDate,
      endDate: l.leave_requests.endDate,
      type: l.leave_requests.type,
      reason: l.leave_requests.reason,
      status: l.leave_requests.status,
      approvedBy: l.leave_requests.approvedBy,
      approvedAt: l.leave_requests.approvedAt,
      rejectionReason: l.leave_requests.rejectionReason,
      createdAt: l.leave_requests.createdAt,
    }));

    return apiSuccess(mapped);
  },
  { method: "GET", requiredPermission: "leaves:read" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const body = await req.json();
    const validated = validateBody(leaveRequestSchema, body);

    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.userId, context.auth.userId));

    if (!staffRecord) {
      const error = new Error("Staff profile not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [inserted] = await db.insert(leaveRequests).values({
      tenantId,
      staffId: staffRecord.id,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      type: validated.type,
      reason: validated.reason,
    }).returning();

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "leaves:create" }
);
