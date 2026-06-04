import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) return apiError("No avatar file provided", "VALIDATION_ERROR", 400);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUri = `data:${mime};base64,${base64}`;

    await db.update(customers)
      .set({ imageUrl: dataUri, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ imageUrl: dataUri });
  } catch {
    return apiError("Upload failed", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;

    await db.update(customers)
      .set({ imageUrl: null, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ deleted: true });
  } catch {
    return apiError("Delete failed", "INTERNAL_ERROR", 500);
  }
}
