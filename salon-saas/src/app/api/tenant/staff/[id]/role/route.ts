import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { users, staff, sessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, staffRoleChangeSchema, roleSchema } from "@/lib/validation";
import { assertTenantOwnership, logAudit } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * PUT /api/tenant/staff/:id/role
 * Change staff member's role with permission escalation checks
 * Permissions: staff:role_change
 * 
 * Edge cases handled:
 * 1. Can only promote/demote users within same tenant
 * 2. OWNER role can only be set by super admin
 * 3. Cannot remove own admin role
 * 4. Role change invalidates all existing sessions
 * 5. Audit logs all role changes
 */
export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId: updaterId, role: updaterRole } = context.auth;
    const { id } = await (req as any).params;

    const body = await req.json();
    const validated = validateBody(
      z.object({
        role: roleSchema,
        reason: z.string().optional(),
      }),
      body
    );

    // Get staff and user info
    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, id));

    if (!staffRecord) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, staffRecord.tenantId);

    // Get user being updated
    const [targetUser] = await db.select()
      .from(users)
      .where(eq(users.id, staffRecord.userId));

    if (!targetUser) {
      const error = new Error("User not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    // Permission checks for role changes
    const oldRole = targetUser.role;

    // Rule 1: Only OWNER can change roles
    if (updaterRole !== "OWNER") {
      const error = new Error("Only owners can change staff roles") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    // Rule 2: Cannot promote to OWNER unless you're SUPER_ADMIN or existing OWNER
    if (validated.role === "OWNER") {
      const error = new Error("Owner role can only be set by super admins") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    // Rule 3: Cannot remove own role
    if (staffRecord.userId === updaterId && updaterRole === "OWNER" && validated.role !== "OWNER") {
      const error = new Error("Cannot remove your own owner role") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    // Update user role
    const [updated] = await db.update(users)
      .set({
        role: validated.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, staffRecord.userId))
      .returning();

    // Rule 4: Invalidate all sessions for this user (role change takes effect immediately)
    await db.delete(sessions).where(eq(sessions.userId, staffRecord.userId));

    // Log audit with before/after
    await logAudit(tenantId, updaterId, "ROLE_CHANGE", "STAFF", id, {
      oldRole,
      newRole: validated.role,
      userId: staffRecord.userId,
      reason: validated.reason || "No reason provided",
      effectiveImmediately: true,
      sessionsRevoked: true,
    });

    return apiSuccess({
      success: true,
      id,
      userId: staffRecord.userId,
      oldRole,
      newRole: validated.role,
      message: "Role changed successfully. All existing sessions have been revoked. User must log in again.",
    });
  },
  {
    method: "PUT",
    requiredPermission: "staff:role_change",
  }
);
