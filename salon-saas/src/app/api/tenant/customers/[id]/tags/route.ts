import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { addTagSchema } from "@/lib/validators/crm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;
    const body = await req.json();
    const parsed = addTagSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const currentTags = customer.tags || [];
    if (currentTags.includes(parsed.data.tag)) {
      return apiSuccess({ tags: currentTags });
    }

    const newTags = [...currentTags, parsed.data.tag];
    await db.update(customers)
      .set({ tags: newTags, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ tags: newTags });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;
    const body = await req.json();
    const { tag } = body;
    if (!tag) return apiError("Tag is required", "VALIDATION_ERROR", 400);

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const currentTags = customer.tags || [];
    const newTags = currentTags.filter((t: string) => t !== tag);
    await db.update(customers)
      .set({ tags: newTags, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ tags: newTags });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
