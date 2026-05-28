import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const list = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      phone: users.phone,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.tenantId, id));

    return apiSuccess(list);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { name, email, password, role, phone } = body;

    if (!name || !email || !password) {
      return apiError("Missing required fields", "VALIDATION_ERROR", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [inserted] = await db.insert(users).values({
      tenantId: id,
      email,
      name,
      phone: phone || null,
      passwordHash,
      role: role || "RECEPTIONIST",
    }).returning();

    await createAuditLog({
      tenantId: id,
      userId: session.user.id,
      action: "create_user",
      entityType: "user",
      entityId: inserted.id,
      changes: { name, email, role },
    });

    return apiSuccess(inserted, 201);
  } catch (err: any) {
    return apiError("Failed to create user", "INTERNAL_ERROR", 500);
  }
}
