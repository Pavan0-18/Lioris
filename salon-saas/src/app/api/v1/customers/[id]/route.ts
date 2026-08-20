import { createPublicApiHandler } from "@/lib/public-api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().max(120).optional().or(z.literal("").transform(() => undefined)),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().datetime().optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  isActive: z.boolean().optional(),
});

async function findOwnCustomer(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
    .limit(1);
  return row ?? null;
}

export const GET = createPublicApiHandler(
  async (req, context) => {
    const { id } = await context.params;
    const customer = await findOwnCustomer(context.tenantId, id);
    if (!customer) {
      const error = new Error("Customer not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    return { customer };
  },
  { requiredScope: "customers:read" }
);

export const PUT = createPublicApiHandler(
  async (req, context) => {
    const { id } = await context.params;
    const body = context.body;
    const validated = validateBody(updateSchema, body);

    const existing = await findOwnCustomer(context.tenantId, id);
    if (!existing) {
      const error = new Error("Customer not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [customer] = await db
      .update(customers)
      .set({
        name: validated.name ?? existing.name,
        phone: validated.phone ?? existing.phone,
        email: validated.email !== undefined ? validated.email ?? null : existing.email,
        gender: validated.gender ?? existing.gender,
        dob: validated.dob ? new Date(validated.dob) : existing.dob,
        address: validated.address ?? existing.address,
        notes: validated.notes ?? existing.notes,
        tags: validated.tags ?? existing.tags,
        isActive: validated.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.tenantId, context.tenantId), eq(customers.id, id)))
      .returning();

    await logAudit(context.tenantId, `api:${context.keyId}`, "UPDATE", "CUSTOMER", customer.id, {
      via: "api",
    });

    return { customer };
  },
  { requiredScope: "customers:write", idempotent: true }
);

export const DELETE = createPublicApiHandler(
  async (req, context) => {
    const { id } = await context.params;
    const existing = await findOwnCustomer(context.tenantId, id);
    if (!existing) {
      const error = new Error("Customer not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    await db
      .delete(customers)
      .where(and(eq(customers.tenantId, context.tenantId), eq(customers.id, id)));

    await logAudit(context.tenantId, `api:${context.keyId}`, "DELETE", "CUSTOMER", id, {
      via: "api",
    });

    return { deleted: true };
  },
  { requiredScope: "customers:write" }
);