import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const DELETE = createApiHandler(async (req) => {
  const id = getRouteId(req);

  const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!session) { const e = new Error("Session not found") as any; e.code = "NOT_FOUND"; throw e; }

  await db.delete(sessions).where(eq(sessions.id, id));

  await db.update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, session.userId));

  return apiSuccess({ success: true });
}, { method: "DELETE" });
