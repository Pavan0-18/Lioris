import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { staff, users, branches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, validateQuery, staffCreateSchema, paginationSchema } from "@/lib/validation";
import { assertTenantOwnership, logAudit, getChanges } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * GET /api/tenant/staff
 * List staff members for tenant
 * Permissions: staff:read
 * 
 * Optimizations:
 * - Field selection: only fetch needed columns
 * - Timing logs: track query execution time
 * - Pagination: limit results per page
 */
export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const startTime = performance.now();

    const { page, limit } = validateQuery(paginationSchema, url);
    const offset = (page - 1) * limit;

    const queryStartTime = performance.now();
    const list = await db.select({
      // Only fetch needed fields (not all columns)
      id: staff.id,
      userId: staff.userId,
      name: users.name,
      email: users.email,
      designation: staff.designation,
      branchId: staff.branchId,
    })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)))
      .limit(limit)
      .offset(offset);

    const queryTime = performance.now() - queryStartTime;

    const mapped = list.map(item => ({
      id: item.id,
      userId: item.userId,
      name: item.name,
      email: item.email,
      designation: item.designation,
      branchId: item.branchId,
    }));

    const totalTime = performance.now() - startTime;
    console.log(`[STAFF API] Complete. queryTime=${Math.round(queryTime)}ms, totalTime=${Math.round(totalTime)}ms, results=${list.length}`);

    return apiSuccess(mapped);
  },
  {
    method: "GET",
    requiredPermission: "staff:read",
  }
);

/**
 * POST /api/tenant/staff
 * Create new staff member
 * Permissions: staff:create
 */
export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId: creatorId } = context.auth;

    const body = await req.json();
    const validated = validateBody(staffCreateSchema, body);

    // Verify branch belongs to tenant
    const [branch] = await db.select()
      .from(branches)
      .where(eq(branches.id, validated.branchId));

    if (!branch) {
      const error = new Error("Branch not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, branch.tenantId);

    // Verify user exists and belongs to tenant
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, validated.userId));

    if (!user) {
      const error = new Error("User not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, user.tenantId);

    // Verify user not already staff
    const [existingStaff] = await db.select()
      .from(staff)
      .where(eq(staff.userId, validated.userId));

    if (existingStaff) {
      const error = new Error("User is already a staff member") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    // Create staff record
    const [insertedStaff] = await db.insert(staff).values({
      tenantId,
      userId: validated.userId,
      branchId: validated.branchId,
      designation: validated.designation || null,
      employeeCode: validated.employeeCode || null,
      joiningDate: validated.joiningDate ? new Date(validated.joiningDate) : null,
      baseSalary: validated.baseSalary,
      salaryType: validated.salaryType,
      commissionType: validated.commissionType,
      isActive: true,
    }).returning();

    // Log audit
    await logAudit(tenantId, creatorId, "CREATE", "STAFF", insertedStaff.id, {
      userId: validated.userId,
      branchId: validated.branchId,
      designation: validated.designation,
    });

    const [fullRecord] = await db.select()
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.id, insertedStaff.id));

    return apiSuccess({
      id: fullRecord.staff.id,
      userId: fullRecord.staff.userId,
      name: fullRecord.users.name,
      email: fullRecord.users.email,
      role: fullRecord.users.role,
      designation: fullRecord.staff.designation,
      isActive: fullRecord.staff.isActive,
      baseSalary: fullRecord.staff.baseSalary,
      salaryType: fullRecord.staff.salaryType,
      branchId: fullRecord.staff.branchId,
    });
  },
  {
    method: "POST",
    requiredPermission: "staff:create",
  }
);
