import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, superAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  loginType: z.enum(["tenant", "superadmin"]).default("tenant"),
});

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
      },
      async authorize(raw: any) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, loginType } = parsed.data;

        if (loginType === "superadmin") {
          const sa = await db.query.superAdmins.findFirst({
            where: eq(superAdmins.email, email),
          });
          if (!sa) return null;
          const valid = await compare(password, sa.passwordHash);
          if (!valid) return null;
          return {
            id: sa.id,
            email: sa.email,
            name: sa.name,
            role: "SUPER_ADMIN",
            tenantId: null,
            tenantSlug: null,
          };
        }

        // Tenant user login
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
          with: { tenant: true },
        });
        if (!user) return null;
        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;
        if (!user.isActive) return null;
        if (!user.tenant || !(user.tenant as any).isActive) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: (user.tenant as any).slug,
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
