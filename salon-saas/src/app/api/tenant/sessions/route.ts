import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq, desc, and, isNotNull, sql } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { userId } = context.auth;

  const list = await db.select({
    id: sessions.id,
    ipAddress: sessions.ipAddress,
    userAgent: sessions.userAgent,
    lastActiveAt: sessions.lastActiveAt,
    createdAt: sessions.createdAt,
    expiresAt: sessions.expiresAt,
  })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNotNull(sessions.token)))
    .orderBy(desc(sessions.lastActiveAt));

  return apiSuccess(list);
}, { method: "GET" });

export const DELETE = createApiHandler(async (req, context) => {
  const { userId } = context.auth;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("id");

  if (sessionId) {
    const [s] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId))).limit(1);
    if (!s) { const e = new Error("Session not found") as any; e.code = "NOT_FOUND"; throw e; }
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  await db.update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));

  return apiSuccess({ success: true });
}, { method: "DELETE" });
