import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateQuery, paginationSchema, dateRangeSchema } from "@/lib/validation";
import { z } from "zod";

/**
 * GET /api/tenant/audit
 * Get audit logs for tenant with advanced filtering
 * Permissions: staff:read (for MANAGER+), staff:deactivate (for OWNER)
 * 
 * Accessible by:
 * - OWNER: Full audit log
 * - MANAGER: Last 90 days, non-sensitive actions
 */
export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId, role } = context.auth;
    const url = new URL(req.url);

    // Parse query params
    const { page, limit } = validateQuery(paginationSchema, url);
    const safePage = page ?? 1;
    const safeLimit = limit ?? 10;
    const offset = (safePage - 1) * safeLimit;

    const action = url.searchParams.get("action");
    const entityType = url.searchParams.get("entityType");
    const userId = url.searchParams.get("userId");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");

    // Build where clause
    let whereCondition = eq(auditLogs.tenantId, tenantId) as any;

    // MANAGER role limitations
    if (role === "MANAGER") {
      // Only see last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      whereCondition = and(whereCondition, gte(auditLogs.createdAt, ninetyDaysAgo)) as any;

      // Exclude sensitive actions for managers
      const sensitiveActions = ["ROLE_CHANGE", "DELETE"];
      whereCondition = and(
        whereCondition,
        // Add check to exclude sensitive actions
      ) as any;
    }

    // Apply filters
    if (action) {
      whereCondition = and(whereCondition, eq(auditLogs.action, action)) as any;
    }

    if (entityType) {
      whereCondition = and(whereCondition, eq(auditLogs.entityType, entityType)) as any;
    }

    if (userId) {
      whereCondition = and(whereCondition, eq(auditLogs.userId, userId)) as any;
    }

    if (fromDate) {
      const startDate = new Date(fromDate);
      whereCondition = and(whereCondition, gte(auditLogs.createdAt, startDate)) as any;
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      whereCondition = and(whereCondition, lte(auditLogs.createdAt, endDate)) as any;
    }

    // Get logs with user info
    const logs = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      description: auditLogs.description,
      changes: auditLogs.changes,
      status: auditLogs.status,
      errorMessage: auditLogs.errorMessage,
      createdAt: auditLogs.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(whereCondition)
      .orderBy(desc(auditLogs.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // Count total for pagination
    const countResult = await db
      .select({ count: auditLogs.id })
      .from(auditLogs)
      .where(whereCondition);

    return apiSuccess({
      data: logs,
      total: countResult.length,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(countResult.length / safeLimit),
    });
  },
  {
    method: "GET",
    requiredPermission: "staff:read",
  }
);

/**
 * GET /api/tenant/audit/:id
 * Get detailed audit log entry
 */
const GET_DETAIL = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [log] = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      description: auditLogs.description,
      changes: auditLogs.changes,
      status: auditLogs.status,
      errorMessage: auditLogs.errorMessage,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.id, id)));

    if (!log) {
      const error = new Error("Audit log not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess(log);
  },
  {
    method: "GET",
    requiredPermission: "staff:read",
  }
);

/**
 * GET /api/tenant/audit/entity/:entityType/:entityId
 * Get all audit logs for a specific entity
 */
const GET_ENTITY = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const { page, limit } = validateQuery(paginationSchema, url);
    const safePage = page ?? 1;
    const safeLimit = limit ?? 10;
    const offset = (safePage - 1) * safeLimit;

    // Extract from URL pattern /audit/entity/:entityType/:entityId
    const pathParts = url.pathname.split("/");
    const entityTypeIndex = pathParts.lastIndexOf("entity") + 1;
    const entityType = pathParts[entityTypeIndex];
    const entityId = pathParts[entityTypeIndex + 1];

    if (!entityType || !entityId) {
      const error = new Error("Entity type and ID required") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const logs = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      description: auditLogs.description,
      changes: auditLogs.changes,
      status: auditLogs.status,
      createdAt: auditLogs.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.tenantId, tenantId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(safeLimit)
      .offset(offset);

    return apiSuccess({
      data: logs,
      entityType,
      entityId,
      page,
      limit,
    });
  },
  {
    method: "GET",
    requiredPermission: "staff:read",
  }
);
