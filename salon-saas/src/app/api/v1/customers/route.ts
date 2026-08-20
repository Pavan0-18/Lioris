import { createPublicApiHandler } from "@/lib/public-api-handler";
import { z } from "zod";
import { validateBody, validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, desc, eq, like, or } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const listQuerySchema = z.object({
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(30),
  email: z.string().email().max(120).optional().or(z.literal("").transform(() => undefined)),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().datetime().optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
});

export const GET = createPublicApiHandler(
  async (req, context) => {
    const url = new URL(req.url);
    const query = validateQuery(listQuerySchema, url);

    const conditions = and(
      eq(customers.tenantId, context.tenantId),
      query.q
        ? or(
            like(customers.name, `%${query.q}%`),
            like(customers.phone, `%${query.q}%`)
          )
        : undefined
    );

    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        gender: customers.gender,
        tags: customers.tags,
        loyaltyPoints: customers.loyaltyPoints,
        isActive: customers.isActive,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(conditions)
      .orderBy(desc(customers.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return { customers: rows, pagination: { page: query.page, limit: query.limit } };
  },
  { requiredScope: "customers:read" }
);

export const POST = createPublicApiHandler(
  async (req, context) => {
    const body = context.body;
    const validated = validateBody(createSchema, body);

    const [customer] = await db
      .insert(customers)
      .values({
        tenantId: context.tenantId,
        name: validated.name,
        phone: validated.phone,
        email: validated.email ?? null,
        gender: validated.gender ?? null,
        dob: validated.dob ? new Date(validated.dob) : null,
        address: validated.address ?? null,
        notes: validated.notes ?? null,
        tags: validated.tags ?? [],
      })
      .returning({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        createdAt: customers.createdAt,
      });

    await logAudit(context.tenantId, `api:${context.keyId}`, "CREATE", "CUSTOMER", customer.id, {
      via: "api",
    });

    return { customer };
  },
  { requiredScope: "customers:write", idempotent: true }
);