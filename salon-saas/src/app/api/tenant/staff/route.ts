import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { staff, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const list = await db.select()
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));

    const mapped = list.map(item => ({
      id: item.staff.id,
      name: item.users.name,
      role: item.users.role,
      designation: item.staff.designation,
      isActive: item.staff.isActive,
      baseSalary: item.staff.baseSalary,
      salaryType: item.staff.salaryType,
      user: item.users
    }));

    return apiSuccess(mapped);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();

    // Create User first
    const passwordHash = await bcrypt.hash(body.password, 12);
    const [insertedUser] = await db.insert(users).values({
      tenantId,
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role,
      isActive: true
    }).returning();

    // Create Staff
    const [insertedStaff] = await db.insert(staff).values({
      tenantId,
      userId: insertedUser.id,
      branchId: body.branchId,
      designation: body.designation,
      employeeCode: body.employeeCode,
      baseSalary: body.baseSalary,
      salaryType: body.salaryType,
      commissionType: body.commissionType,
      isActive: true
    }).returning();

    return apiSuccess(insertedStaff);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
