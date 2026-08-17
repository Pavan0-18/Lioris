import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import {
  generateSecret,
  generateBackupCodes,
  hashBackupCodes,
  verifyTOTP,
  buildOtpauthUrl,
} from "@/lib/two-factor";
import { logAudit } from "@/lib/auth-utils";

const startSchema = z.object({
  step: z.literal("start"),
});

const verifySchema = z.object({
  step: z.literal("verify"),
  secret: z.string().min(16),
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
  backupCodes: z.array(z.string().min(8)).optional(),
});

const disableSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const POST = createApiHandler(
  async (req, context) => {
    const { userId, tenantId } = context.auth;
    const body = await req.json();

    if (body.step === "start") {
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const secret = generateSecret();
      const backupCodes = generateBackupCodes();
      return apiSuccess({
        secret,
        otpauthUrl: buildOtpauthUrl(secret, user?.email || "user", "Lioris"),
        backupCodes,
      });
    }

    const validated = validateBody(verifySchema, body);

    if (!(await verifyTOTP(validated.secret, validated.token))) {
      const error = new Error("Invalid code. Check that your authenticator app is showing the correct code") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      const error = new Error("User not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.update(users).set({
      twoFactorEnabled: true,
      twoFactorSecret: validated.secret,
      twoFactorBackupCodes: validated.backupCodes?.length
        ? await hashBackupCodes(validated.backupCodes)
        : null,
    }).where(eq(users.id, userId));

    await logAudit(tenantId, userId, "ENABLE", "USER_2FA", userId, { method: "totp" });

    return apiSuccess({ success: true, twoFactorEnabled: true });
  },
  { method: "POST", requiredPermission: "settings:update" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { userId, tenantId } = context.auth;
    const body = await req.json();
    const validated = validateBody(disableSchema, body);

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      const error = new Error("User not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const valid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!valid) {
      const error = new Error("Password is incorrect") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    await db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    }).where(eq(users.id, userId));

    await logAudit(tenantId, userId, "DISABLE", "USER_2FA", userId, { method: "totp" });

    return apiSuccess({ success: true, twoFactorEnabled: false });
  },
  { method: "DELETE", requiredPermission: "settings:update" }
);