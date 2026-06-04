import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { userId } = context.auth;

    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      const error = new Error("User not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess({
      ...user,
      hasPassword: true,
      twoFactorEnabled: false,
    });
  },
  { method: "GET", requiredPermission: "settings:read" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(profileUpdateSchema, body);

    const updateData: Record<string, any> = {};

    if (validated.name) updateData.name = validated.name;
    if (validated.email) updateData.email = validated.email;

    if (validated.newPassword) {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        const error = new Error("User not found") as any;
        error.code = "NOT_FOUND";
        throw error;
      }

      if (!validated.currentPassword) {
        const error = new Error("Current password required") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }

      const valid = await bcrypt.compare(validated.currentPassword, user.passwordHash);
      if (!valid) {
        const error = new Error("Current password is incorrect") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }

      updateData.passwordHash = await bcrypt.hash(validated.newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return apiSuccess({ success: true });
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return apiSuccess({ success: true });
  },
  { method: "PUT", requiredPermission: "settings:update" }
);
