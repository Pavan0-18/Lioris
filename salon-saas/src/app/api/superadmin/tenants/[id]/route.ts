import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, tenantFeatures, features } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxLabel: z.string().optional(),
});

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    const mappedFeatures = await db.select()
      .from(features);

    const tenantFeaturesList = await db.select()
      .from(tenantFeatures)
      .where(eq(tenantFeatures.tenantId, id));

    const finalFeatures = mappedFeatures.map(f => {
      const active = tenantFeaturesList.find(tf => tf.featureId === f.id);
      return {
        id: f.id,
        name: f.name,
        key: f.key,
        isEnabled: active ? active.isEnabled : false
      };
    });

    return apiSuccess({
      ...tenant,
      featuresList: finalFeatures
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    const body = await req.json();
    const parsed = updateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", "VALIDATION_ERROR", 400);
    }

    const { name, email, phone, country, timezone, locale, taxRate, taxLabel } = parsed.data;

    // Check if email is already taken by another tenant
    if (email && email !== tenant.email) {
      const [existing] = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
      if (existing) {
        return apiError("Email already in use", "VALIDATION_ERROR", 400);
      }
    }

    const updateData: any = {};
    const changes: any = {};

    if (name !== undefined) {
      updateData.name = name;
      if (name !== tenant.name) changes.name = { from: tenant.name, to: name };
    }
    if (email !== undefined) {
      updateData.email = email;
      if (email !== tenant.email) changes.email = { from: tenant.email, to: email };
    }
    if (phone !== undefined) {
      updateData.phone = phone;
      if (phone !== tenant.phone) changes.phone = { from: tenant.phone, to: phone };
    }
    if (country !== undefined) {
      updateData.country = country;
      if (country !== tenant.country) changes.country = { from: tenant.country, to: country };
    }
    if (timezone !== undefined) {
      updateData.timezone = timezone;
      if (timezone !== tenant.timezone) changes.timezone = { from: tenant.timezone, to: timezone };
    }
    if (locale !== undefined) {
      updateData.locale = locale;
      if (locale !== tenant.locale) changes.locale = { from: tenant.locale, to: locale };
    }
    if (taxRate !== undefined) {
      updateData.taxRate = taxRate;
      if (taxRate !== tenant.taxRate) changes.taxRate = { from: tenant.taxRate, to: taxRate };
    }
    if (taxLabel !== undefined) {
      updateData.taxLabel = taxLabel;
      if (taxLabel !== tenant.taxLabel) changes.taxLabel = { from: tenant.taxLabel, to: taxLabel };
    }

    updateData.updatedAt = new Date();

    const [updated] = await db.update(tenants).set(updateData).where(eq(tenants.id, id)).returning();

    // Log audit
    if (Object.keys(changes).length > 0) {
      await createAuditLog({
        tenantId: id,
        userId: session.user.id,
        action: "update_tenant",
        entityType: "tenant",
        entityId: id,
        changes
      });
    }

    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    // Soft delete - mark tenant as inactive and archive it
    const [deleted] = await db.update(tenants).set({
      isActive: false,
      planStatus: "archived",
      updatedAt: new Date()
    }).where(eq(tenants.id, id)).returning();

    // Log audit
    await createAuditLog({
      tenantId: id,
      userId: session.user.id,
      action: "delete_tenant",
      entityType: "tenant",
      entityId: id,
      changes: { status: "deleted" }
    });

    return apiSuccess({ message: "Tenant archived successfully", tenant: deleted });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
