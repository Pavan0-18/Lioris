import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided", "INVALID_INPUT", 400);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", tenantId);
    const filePath = join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const url = `/uploads/${tenantId}/${filename}`;
    return apiSuccess({ url });
  } catch (err: any) {
    return apiError("Upload failed", "INTERNAL_ERROR", 500);
  }
}
