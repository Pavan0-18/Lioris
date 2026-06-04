import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiSuccess, apiError, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { waitlistCreateSchema } from "@/lib/validators/appointment";
import { logAudit } from "@/lib/auth-utils";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const conditions = [eq(waitlist.tenantId, tenantId)];
    if (status) conditions.push(eq(waitlist.status, status));

    const rows = await db.select()
      .from(waitlist)
      .where(and(...conditions))
      .orderBy(desc(waitlist.createdAt));

    return apiSuccess(rows);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");

    const body = await req.json();
    const parsed = waitlistCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "INVALID_INPUT", 400);
    }

    const data = parsed.data;

    const [inserted] = await db.insert(waitlist).values({
      tenantId,
      branchId: data.branchId,
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceIds: data.serviceIds,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      preferredStaffId: data.preferredStaffId || null,
      notes: data.notes || null,
      status: "pending",
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "WAITLIST", inserted.id, {
      customerName: data.customerName,
      serviceCount: data.serviceIds.length,
    });

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");

    const body = await req.json();
    const { id, status: newStatus } = body;

    if (!id || !newStatus) {
      return apiError("id and status are required", "INVALID_INPUT", 400);
    }

    const [existing] = await db.select()
      .from(waitlist)
      .where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)))
      .limit(1);

    if (!existing) return apiError("Waitlist entry not found", "NOT_FOUND", 404);

    const [updated] = await db.update(waitlist)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "WAITLIST", id, { fromStatus: existing.status, toStatus: newStatus });

    return apiSuccess(updated);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return apiError("id is required", "INVALID_INPUT", 400);

    const [deleted] = await db.delete(waitlist)
      .where(and(eq(waitlist.id, id), eq(waitlist.tenantId, tenantId)))
      .returning();

    if (!deleted) return apiError("Waitlist entry not found", "NOT_FOUND", 404);

    await logAudit(tenantId, userId, "DELETE", "WAITLIST", id, {});

    return apiSuccess({ deleted: true });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
