import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { importEntityCsv } from "@/lib/import-export";

const importSchema = z.object({
  csv: z.string().min(1).max(5_000_000),
});

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key } = await (req as any).params;

    let csv: string;
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        const error = new Error("CSV file is required") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
      csv = await file.text();
    } else {
      const body = await req.json().catch(() => null);
      const validated = validateBody(importSchema, body);
      csv = validated.csv;
    }

    const result = await importEntityCsv(tenantId, userId, key, csv);
    return apiSuccess(result);
  },
  { method: "POST", requiredPermission: "entities:manage" }
);