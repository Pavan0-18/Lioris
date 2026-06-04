import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { providerConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody } from "@/lib/validation";
import { z } from "zod";

const providerSchema = z.object({
  provider: z.enum(["sendgrid", "twilio_sms", "twilio_whatsapp"]),
  config: z.record(z.string(), z.any()),
  isActive: z.boolean().optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    const conditions = [eq(providerConfigs.tenantId, tenantId)];
    if (provider) conditions.push(eq(providerConfigs.provider, provider));

    const configs = await db.select()
      .from(providerConfigs)
      .where(and(...conditions));

    return apiSuccess(configs);
  },
  { method: "GET", requiredPermission: "settings:read" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const body = await req.json();
    const validated = validateBody(providerSchema, body);

    const [existing] = await db.select()
      .from(providerConfigs)
      .where(and(
        eq(providerConfigs.tenantId, tenantId),
        eq(providerConfigs.provider, validated.provider),
      ))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(providerConfigs)
        .set({
          config: JSON.stringify(validated.config),
          isActive: validated.isActive ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(providerConfigs.id, existing.id))
        .returning();
      return apiSuccess(updated);
    }

    const [inserted] = await db.insert(providerConfigs).values({
      tenantId,
      provider: validated.provider,
      config: JSON.stringify(validated.config),
      isActive: validated.isActive ?? false,
    }).returning();

    return apiSuccess(inserted);
  },
  { method: "PUT", requiredPermission: "settings:update" }
);
