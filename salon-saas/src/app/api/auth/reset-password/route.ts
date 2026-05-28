import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, superAdmins, verificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password || password.length < 8) {
      return apiError("Invalid input", "VALIDATION_ERROR", 400);
    }

    const vt = await db
      .select()
      .from(verificationTokens)
      .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token), gt(verificationTokens.expiresAt, new Date())))
      .limit(1)
      .then((r) => r[0]);

    if (!vt) return apiError("Invalid or expired token", "INVALID_TOKEN", 400);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.update(users).set({ passwordHash }).where(eq(users.email, email));
    await db.update(superAdmins).set({ passwordHash }).where(eq(superAdmins.email, email));

    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

    return apiSuccess({ ok: true });
  } catch (err: any) {
    console.error("[reset-password]", err);
    return apiError("Failed to reset password", "INTERNAL_ERROR", 500);
  }
}
