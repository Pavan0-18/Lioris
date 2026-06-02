import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { staff, staffServices, services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { assertTenantOwnership } from "@/lib/auth-utils";

/**
 * GET /api/tenant/staff/:id/services
 * List services assigned to a staff member with commission rates
 * Permissions: staff:read
 */
export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);

    if (!staffRecord) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, staffRecord.tenantId);

    const assignments = await db.select({
      id: staffServices.id,
      serviceId: staffServices.serviceId,
      commissionPct: staffServices.commissionPct,
      serviceName: services.name,
      serviceDuration: services.duration,
      servicePrice: services.price,
    })
      .from(staffServices)
      .innerJoin(services, eq(staffServices.serviceId, services.id))
      .where(eq(staffServices.staffId, id));

    return apiSuccess(assignments);
  },
  {
    method: "GET",
    requiredPermission: "staff:read",
  }
);

/**
 * PUT /api/tenant/staff/:id/services
 * Replace all service assignments for a staff member
 * Permissions: staff:update
 * Body: { services: Array<{ serviceId: string, commissionPct: number }> }
 */
export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);

    if (!staffRecord) {
      const error = new Error("Staff not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    assertTenantOwnership(tenantId, staffRecord.tenantId);

    const body = await req.json();
    const serviceList = body.services || [];

    // Validate all services exist and belong to this tenant
    if (serviceList.length > 0) {
      const serviceIds = serviceList.map((s: any) => s.serviceId);
      const validServices = await db.select({ id: services.id })
        .from(services)
        .where(and(eq(services.tenantId, tenantId), ...serviceIds.map((sid: string) => eq(services.id, sid))));

      if (validServices.length !== serviceIds.length) {
        const error = new Error("One or more services are invalid") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
    }

    // Replace all assignments
    await db.delete(staffServices).where(eq(staffServices.staffId, id));

    if (serviceList.length > 0) {
      await db.insert(staffServices).values(
        serviceList.map((s: any) => ({
          staffId: id,
          serviceId: s.serviceId,
          commissionPct: s.commissionPct || 0,
        }))
      );
    }

    return apiSuccess({ success: true, count: serviceList.length });
  },
  {
    method: "PUT",
    requiredPermission: "staff:update",
  }
);
