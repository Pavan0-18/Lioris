import { createPublicApiHandler } from "@/lib/public-api-handler";
import { z } from "zod";
import { validateBody, validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { appointments, customers } from "@/lib/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const listQuerySchema = z.object({
  status: z.string().max(30).optional(),
  customerId: z.string().optional(),
  staffId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  branchId: z.string().min(1),
  staffId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  type: z.string().max(30).default("booking"),
  depositAmount: z.number().min(0).optional(),
});

export const GET = createPublicApiHandler(
  async (req, context) => {
    const url = new URL(req.url);
    const query = validateQuery(listQuerySchema, url);

    const conditions = and(
      eq(appointments.tenantId, context.tenantId),
      query.status ? eq(appointments.status, query.status) : undefined,
      query.customerId ? eq(appointments.customerId, query.customerId) : undefined,
      query.staffId ? eq(appointments.staffId, query.staffId) : undefined,
      query.from ? gte(appointments.startTime, new Date(query.from)) : undefined,
      query.to ? lte(appointments.startTime, new Date(query.to)) : undefined
    );

    const rows = await db
      .select({
        id: appointments.id,
        customerId: appointments.customerId,
        customerName: customers.name,
        staffId: appointments.staffId,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(conditions)
      .orderBy(desc(appointments.startTime))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return { appointments: rows, pagination: { page: query.page, limit: query.limit } };
  },
  { requiredScope: "appointments:read" }
);

export const POST = createPublicApiHandler(
  async (req, context) => {
    const body = context.body;
    const validated = validateBody(createSchema, body);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, context.tenantId), eq(customers.id, validated.customerId)))
      .limit(1);
    if (!customer) {
      const error = new Error("Customer not found") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const start = new Date(validated.startTime);
    const end = new Date(validated.endTime);
    if (end <= start) {
      const error = new Error("endTime must be after startTime") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [appointment] = await db
      .insert(appointments)
      .values({
        tenantId: context.tenantId,
        branchId: validated.branchId,
        customerId: validated.customerId,
        staffId: validated.staffId ?? null,
        startTime: start,
        endTime: end,
        status: "scheduled",
        type: validated.type,
        notes: validated.notes ?? null,
        createdBy: `api:${context.keyId}`,
        depositAmount: validated.depositAmount ?? 0,
      })
      .returning();

    await logAudit(context.tenantId, `api:${context.keyId}`, "CREATE", "APPOINTMENT", appointment.id, {
      via: "api",
    });

    return { appointment };
  },
  { requiredScope: "appointments:write", idempotent: true }
);