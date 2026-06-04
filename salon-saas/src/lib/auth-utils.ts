import { can, type Role } from "@/lib/permissions";
import { db } from "@/lib/db";
import { users, staff, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface AuthContext {
  tenantId: string;
  userId: string;
  role: Role;
}

/**
 * Check if a user has permission for an action
 * @param role User's role
 * @param permission Permission to check (e.g., "appointments:read")
 * @returns true if user has permission
 */
export function checkPermission(role: Role, permission: string): boolean {
  return can(role, permission as any);
}

/**
 * Verify user has permission for action, throw if not
 * @param role User's role
 * @param permission Permission to check
 * @throws Error if permission denied
 */
export function assertPermission(role: Role, permission: string): void {
  if (!checkPermission(role, permission)) {
    const error = new Error(`Permission denied: ${permission}`) as any;
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }
}

/**
 * Verify a resource belongs to the user's tenant
 * @param tenantId Tenant from auth context
 * @param resourceTenantId Tenant ID of resource
 * @throws Error if not same tenant
 */
export function assertTenantOwnership(tenantId: string, resourceTenantId: string): void {
  if (tenantId !== resourceTenantId) {
    const error = new Error("Tenant mismatch - resource does not belong to your tenant") as any;
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }
}

/**
 * Verify multiple resource tenant IDs match user's tenant
 */
export function assertMultipleTenantOwnership(tenantId: string, resourceTenantIds: string[]): void {
  const mismatched = resourceTenantIds.filter(id => id !== tenantId);
  if (mismatched.length > 0) {
    const error = new Error("One or more resources do not belong to your tenant") as any;
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }
}

/**
 * Get user details with staff info
 */
export async function getUserDetails(userId: string, tenantId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

  if (!user) {
    const error = new Error("User not found") as any;
    error.code = "NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }

  // Get staff record if exists
  const [staffRecord] = await db
    .select()
    .from(staff)
    .where(eq(staff.userId, userId));

  return { user, staff: staffRecord || null };
}

/**
 * Verify user is active and tenant is active
 */
export async function verifyUserActive(userId: string, tenantId: string): Promise<boolean> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

  if (!user || !user.isActive) {
    const error = new Error("User account is not active") as any;
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant || !tenant.isActive) {
    const error = new Error("Tenant account is not active") as any;
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }

  return true;
}

/**
 * Log audit trail
 */
export async function logAudit(
  tenantId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, any>
) {
  try {
    const { auditLogs } = await import("@/lib/db/schema");
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.stringify(changes) : null,
    });
  } catch (err) {
    // Log errors but don't fail the main operation
    console.error("[Audit] Failed to log:", err);
  }
}

/**
 * Extract changes between old and new values
 */
export function getChanges(
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  
  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  for (const key of allKeys) {
    if (oldValues?.[key] !== newValues?.[key]) {
      changes[key] = {
        old: oldValues?.[key],
        new: newValues?.[key],
      };
    }
  }

  return changes;
}
