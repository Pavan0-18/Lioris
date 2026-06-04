import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req) => {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");
  const userId = url.searchParams.get("userId");

  const conditions = [isNotNull(sessions.token)];
  if (tenantId) conditions.push(eq(users.tenantId, tenantId));
  if (userId) conditions.push(eq(sessions.userId, userId));

  const list = await db.select({
    id: sessions.id,
    userId: sessions.userId,
    userName: users.name,
    userEmail: users.email,
    userRole: users.role,
    tenantId: users.tenantId,
    ipAddress: sessions.ipAddress,
    userAgent: sessions.userAgent,
    lastActiveAt: sessions.lastActiveAt,
    createdAt: sessions.createdAt,
    expiresAt: sessions.expiresAt,
  })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.lastActiveAt));

  return apiSuccess(list);
}, { method: "GET" });
