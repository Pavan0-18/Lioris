import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { staff, users, attendance } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, staffUpdateSchema, staffRoleChangeSchema } from "@/lib/validation";
import { assertTenantOwnership, logAudit, getChanges } from "@/lib/auth-utils";

/**
 * GET /api/tenant/staff/:id
 * Get staff member details
 * Permissions: staff:read
 */
export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [item] = await db.select()
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.id, id))
      .limit(1);

    if (!item) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    // Verify staff belongs to tenant
    assertTenantOwnership(tenantId, item.staff.tenantId);

    const attendanceRecords = await db.select()
      .from(attendance)
      .where(eq(attendance.staffId, id));

    return apiSuccess({
      id: item.staff.id,
      userId: item.staff.userId,
      name: item.users.name,
      email: item.users.email,
      role: item.users.role,
      designation: item.staff.designation,
      employeeCode: item.staff.employeeCode,
      baseSalary: item.staff.baseSalary,
      salaryType: item.staff.salaryType,
      branchId: item.staff.branchId,
      joiningDate: item.staff.joiningDate,
      isActive: item.staff.isActive,
      attendance: attendanceRecords,
    });
  },
  {
    method: "GET",
    requiredPermission: "staff:read",
  }
);

/**
 * PUT /api/tenant/staff/:id
 * Update staff member details
 * Permissions: staff:update
 */
export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId: updaterId } = context.auth;
    const { id } = await (req as any).params;

    const body = await req.json();
    const validated = validateBody(staffUpdateSchema, body);

    // Verify staff exists and belongs to tenant
    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, id));

    if (!staffRecord) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, staffRecord.tenantId);

    // Get old values for audit
    const oldValues = {
      designation: staffRecord.designation,
      baseSalary: staffRecord.baseSalary,
      salaryType: staffRecord.salaryType,
    };

    // Update staff record
    const [updated] = await db.update(staff)
      .set({
        branchId: validated.branchId || staffRecord.branchId,
        designation: validated.designation !== undefined ? validated.designation : staffRecord.designation,
        baseSalary: validated.baseSalary !== undefined ? validated.baseSalary : staffRecord.baseSalary,
        salaryType: validated.salaryType || staffRecord.salaryType,
        commissionType: validated.commissionType || staffRecord.commissionType,
      })
      .where(eq(staff.id, id))
      .returning();

    const newValues = {
      designation: updated.designation,
      baseSalary: updated.baseSalary,
      salaryType: updated.salaryType,
    };

    // Log audit
    const changes = getChanges(oldValues, newValues);
    if (Object.keys(changes).length > 0) {
      await logAudit(tenantId, updaterId, "UPDATE", "STAFF", id, changes);
    }

    const [fullRecord] = await db.select()
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.id, id));

    return apiSuccess({
      id: fullRecord.staff.id,
      userId: fullRecord.staff.userId,
      name: fullRecord.users.name,
      email: fullRecord.users.email,
      role: fullRecord.users.role,
      designation: fullRecord.staff.designation,
      baseSalary: fullRecord.staff.baseSalary,
      salaryType: fullRecord.staff.salaryType,
      branchId: fullRecord.staff.branchId,
      isActive: fullRecord.staff.isActive,
    });
  },
  {
    method: "PUT",
    requiredPermission: "staff:update",
  }
);

/**
 * DELETE /api/tenant/staff/:id
 * Deactivate staff member
 * Permissions: staff:deactivate
 */
export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId: updaterId } = context.auth;
    const { id } = await (req as any).params;

    // Verify staff exists and belongs to tenant
    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, id));

    if (!staffRecord) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, staffRecord.tenantId);

    // Deactivate staff
    const [updated] = await db.update(staff)
      .set({ isActive: false })
      .where(eq(staff.id, id))
      .returning();

    // Log audit
    await logAudit(tenantId, updaterId, "DEACTIVATE", "STAFF", id, {
      reason: "Staff member deactivated",
    });

    return apiSuccess({ success: true, id, isActive: updated.isActive });
  },
  {
    method: "DELETE",
    requiredPermission: "staff:deactivate",
  }
);
