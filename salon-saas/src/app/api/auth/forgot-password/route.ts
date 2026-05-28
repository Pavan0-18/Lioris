import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, superAdmins, verificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { apiError, apiSuccess } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { addHours } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return apiError("Email is required", "VALIDATION_ERROR", 400);

    const user = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0]);

    const sa = await db
      .select({ id: superAdmins.id, name: superAdmins.name })
      .from(superAdmins)
      .where(eq(superAdmins.email, email))
      .limit(1)
      .then((r) => r[0]);

    if (!user && !sa) return apiSuccess({ ok: true });

    const token = createId();
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expiresAt: addHours(new Date(), 1),
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    if (resend) {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@salonsaas.com",
        to: email,
        subject: "Reset your password",
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    }

    return apiSuccess({ ok: true });
  } catch (err: any) {
    console.error("[forgot-password]", err);
    return apiError("Failed to send reset email", "INTERNAL_ERROR", 500);
  }
}
