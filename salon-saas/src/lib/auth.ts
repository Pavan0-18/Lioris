import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { db } from "@/lib/db";
import { users, superAdmins, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { z } from "zod";
import { verifyTOTP, verifyBackupCode, removeBackupCode } from "@/lib/two-factor";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  loginType: z.enum(["tenant", "superadmin"]).default("tenant"),
  otp: z.string().optional(),
});

function twoFactorError(code: string): never {
  const err = new CredentialsSignin();
  (err as any).code = code;
  throw err;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(raw: any) {
        const input = typeof raw === "string" ? JSON.parse(raw) : raw;
        const parsed = loginSchema.safeParse(input);
        if (!parsed.success) return null;
        const { email, password, loginType, otp } = parsed.data;

        if (loginType === "superadmin") {
          const [sa] = await db.select().from(superAdmins).where(eq(superAdmins.email, email)).limit(1);
          if (!sa) return null;

          const valid = await compare(password, sa.passwordHash);
          if (!valid) return null;

          if (sa.twoFactorEnabled) {
            if (!otp) twoFactorError("2FA_REQUIRED");
            if (!(await verifyTOTP(sa.twoFactorSecret || "", otp))) {
              if (!(await verifyBackupCode(sa.twoFactorBackupCodes, otp))) twoFactorError("INVALID_OTP");
              const remaining = await removeBackupCode(sa.twoFactorBackupCodes, otp);
              await db.update(superAdmins).set({ twoFactorBackupCodes: remaining }).where(eq(superAdmins.id, sa.id));
            }
          }

          return {
            id: sa.id,
            email: sa.email,
            name: sa.name,
            role: "SUPER_ADMIN",
            tenantId: null,
            tenantSlug: null,
          };
        }

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;
        if (!user.isActive) return null;

        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
        if (!tenant || !tenant.isActive) return null;

        if (user.twoFactorEnabled) {
          if (!otp) twoFactorError("2FA_REQUIRED");
          if (!(await verifyTOTP(user.twoFactorSecret || "", otp))) {
            if (!(await verifyBackupCode(user.twoFactorBackupCodes, otp))) twoFactorError("INVALID_OTP");
            const remaining = await removeBackupCode(user.twoFactorBackupCodes, otp);
            await db.update(users).set({ twoFactorBackupCodes: remaining }).where(eq(users.id, user.id));
          }
        }

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: tenant.slug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId ?? null;
        token.tenantSlug = (user as any).tenantSlug ?? null;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string | null;
        session.user.tenantSlug = token.tenantSlug as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});