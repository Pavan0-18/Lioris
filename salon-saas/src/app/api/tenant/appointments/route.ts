import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { appointments, customers, staff, users, services, appointmentServices, branches } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, validateQuery, appointmentCreateSchema, appointmentUpdateSchema, paginationSchema, dateRangeSchema } from "@/lib/validation";
import { assertTenantOwnership, logAudit, getChanges } from "@/lib/auth-utils";

/**
 * GET /api/tenant/appointments
 * List appointments with filters
 * Permissions: appointments:read
 * 
 * Optimizations:
 * - Field selection: only fetch needed columns
 * - Timing logs: track query execution time
 * - Index usage: (tenant_id, startTime) for fast date filtering
 */
export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const url = new URL(req.url);
    const startTime = performance.now();

    // Validate query parameters
    const { page, limit } = validateQuery(paginationSchema, url);
    const date = url.searchParams.get("date");
    const staffId = url.searchParams.get("staffId");

    let whereClause = eq(appointments.tenantId, tenantId) as any;

    // SECURITY: Stylists can only see their own appointments
    if (role === "STYLIST") {
      const [staffRecord] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(and(eq(staff.userId, userId), eq(staff.tenantId, tenantId)))
        .limit(1);

      if (!staffRecord) {
        const error = new Error("Staff profile not found") as any;
        error.code = "NOT_FOUND";
        throw error;
      }

      whereClause = and(whereClause, eq(appointments.staffId, staffRecord.id));
    } else if (staffId) {
      // Non-stylist roles can filter by staffId if provided
      const [staffRecord] = await db
        .select()
        .from(staff)
        .where(eq(staff.id, staffId));
      
      if (!staffRecord) {
        const error = new Error("Staff not found") as any;
        error.code = "NOT_FOUND";
        throw error;
      }
      
      assertTenantOwnership(tenantId, staffRecord.tenantId);
      whereClause = and(whereClause, eq(appointments.staffId, staffId));
    }

    const safeLimit = limit ?? 10;
    const offset = ((page ?? 1) - 1) * safeLimit;

    const queryStartTime = performance.now();
    const list = await db.select({
      id: appointments.id,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      customerId: appointments.customerId,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
      },
      staffId: appointments.staffId,
    })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(staff, eq(appointments.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(whereClause)
      .orderBy(appointments.startTime)
      .limit(safeLimit)
      .offset(offset);

    const queryTime = performance.now() - queryStartTime;

    const mapped = await Promise.all(list.map(async (item) => {
      let apptServices: any[] = [];
      try {
        const svcRows = await db.select({ name: services.name })
          .from(appointmentServices)
          .innerJoin(services, eq(appointmentServices.serviceId, services.id))
          .where(eq(appointmentServices.appointmentId, item.id));
        apptServices = svcRows;
      } catch {}

      return {
        id: item.id,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        customerId: item.customerId,
        customer: item.customer,
        staffId: item.staffId,
        services: apptServices,
      };
    }));

    const totalTime = performance.now() - startTime;
    console.log(`[APPOINTMENTS API] Complete. queryTime=${Math.round(queryTime)}ms, totalTime=${Math.round(totalTime)}ms, results=${list.length}`);

    return apiSuccess(mapped);
  },
  {
    method: "GET",
    requiredPermission: "appointments:read",
  }
);

/**
 * POST /api/tenant/appointments
 * Create new appointment
 * Permissions: appointments:create
 */
export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    
    const body = await req.json();
    const validated = validateBody(appointmentCreateSchema, body);

    // Verify all resources belong to tenant
    const [branch] = await db.select().from(branches).where(eq(branches.id, validated.branchId));
    if (!branch) {
      const error = new Error("Branch not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    assertTenantOwnership(tenantId, branch.tenantId);

    const [customer] = await db.select().from(customers).where(eq(customers.id, validated.customerId));
    if (!customer) {
      const error = new Error("Customer not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    assertTenantOwnership(tenantId, customer.tenantId);

    // Verify staff if provided
    if (validated.staffId) {
      const [staffRecord] = await db.select().from(staff).where(eq(staff.id, validated.staffId));
      if (!staffRecord) {
        const error = new Error("Staff not found") as any;
        error.code = "NOT_FOUND";
        throw error;
      }
      assertTenantOwnership(tenantId, staffRecord.tenantId);
    }

    // Calculate end time based on service durations
    let totalDuration = 0;
    for (const serviceId of validated.serviceIds) {
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId));
      
      if (!service) {
        const error = new Error(`Service ${serviceId} not found`) as any;
        error.code = "NOT_FOUND";
        throw error;
      }
      totalDuration += service.duration || 30;
    }

    const startTime = new Date(validated.startTime);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    // Create appointment
    const [inserted] = await db.insert(appointments).values({
      tenantId,
      branchId: validated.branchId,
      customerId: validated.customerId,
      staffId: validated.staffId || null,
      startTime,
      endTime,
      status: "scheduled",
      type: validated.type,
      notes: validated.notes || null,
      createdBy: userId,
    }).returning();

    // Add services to appointment
    for (const serviceId of validated.serviceIds) {
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId));
      
      await db.insert(appointmentServices).values({
        appointmentId: inserted.id,
        serviceId,
        price: service.price,
        duration: service.duration,
      });
    }

    // Log audit
    await logAudit(tenantId, userId, "CREATE", "APPOINTMENT", inserted.id, {
      customerId: customer.id,
      staffId: validated.staffId,
      branchId: branch.id,
    });

    const [fullRecord] = await db.select().from(appointments).where(eq(appointments.id, inserted.id));
    return apiSuccess(fullRecord);
  },
  {
    method: "POST",
    requiredPermission: "appointments:create",
  }
);
