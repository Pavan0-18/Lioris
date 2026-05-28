import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, superAdmins, tenants } from "@/lib/db/schema";
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
        try {
          const parsed = loginSchema.safeParse(raw);
          if (!parsed.success) {
            console.log("[Auth] Validation failed:", parsed.error);
            return null;
          }
          const { email, password, loginType } = parsed.data;

          if (loginType === "superadmin") {
            console.log(`[Auth] Super admin login attempt for: ${email}`);
            // Use select syntax instead of query API
            const [sa] = await db.select().from(superAdmins).where(eq(superAdmins.email, email)).limit(1);
            if (!sa) {
              console.log(`[Auth] Super admin not found: ${email}`);
              return null;
            }
            console.log(`[Auth] Super admin found, checking password...`);
            const valid = await compare(password, sa.passwordHash);
            if (!valid) {
              console.log(`[Auth] Invalid password for ${email}`);
              return null;
            }
            console.log(`[Auth] Super admin authenticated: ${email}`);
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
          console.log(`[Auth] Tenant login attempt for: ${email}`);
          const [user] = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          
          if (!user) {
            console.log(`[Auth] User not found: ${email}`);
            return null;
          }

          console.log(`[Auth] User found, checking password...`);
          const valid = await compare(password, user.passwordHash);
          if (!valid) {
            console.log(`[Auth] Invalid password for ${email}`);
            return null;
          }
          if (!user.isActive) {
            console.log(`[Auth] User is inactive: ${email}`);
            return null;
          }

          // Fetch tenant info
          const [tenant] = await db.select()
            .from(tenants)
            .where(eq(tenants.id, user.tenantId))
            .limit(1);

          if (!tenant || !tenant.isActive) {
            console.log(`[Auth] Tenant not found or inactive for user: ${email}`);
            return null;
          }

          console.log(`[Auth] Tenant user authenticated: ${email}`);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: tenant.slug,
          };
        } catch (error: any) {
          console.error("[Auth] Authorization error:", error);
          return null;
        }
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
        try {
          const parsed = loginSchema.safeParse(raw);
          if (!parsed.success) {
            console.log("Validation failed:", parsed.error);
            return null;
          }
          const { email, password, loginType } = parsed.data;

          if (loginType === "superadmin") {
            console.log(`[Auth] Super admin login attempt for: ${email}`);
            // Use select syntax instead of query API
            const [sa] = await db.select().from(superAdmins).where(eq(superAdmins.email, email)).limit(1);
            if (!sa) {
              console.log(`[Auth] Super admin not found: ${email}`);
              return null;
            }
            console.log(`[Auth] Super admin found, checking password...`);
            const valid = await compare(password, sa.passwordHash);
            if (!valid) {
              console.log(`[Auth] Invalid password for ${email}`);
              return null;
            }
            console.log(`[Auth] Super admin authenticated: ${email}`);
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
          console.log(`[Auth] Tenant login attempt for: ${email}`);
          const [user] = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          
          if (!user) {
            console.log(`[Auth] User not found: ${email}`);
            return null;
          }

          const valid = await compare(password, user.passwordHash);
          if (!valid) {
            console.log(`[Auth] Invalid password for ${email}`);
            return null;
          }
          if (!user.isActive) {
            console.log(`[Auth] User is inactive: ${email}`);
            return null;
          }

          console.log(`[Auth] Tenant user authenticated: ${email}`);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: null, // Will need to fetch tenant separately
          };
        } catch (error: any) {
          console.error("[Auth] Authorization error:", error);
          return null;
        }
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
