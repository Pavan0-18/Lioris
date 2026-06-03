import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided", "VALIDATION_ERROR", 400);

    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return apiError("CSV must have a header and at least one row", "VALIDATION_ERROR", 400);

    const header = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const nameIdx = header.indexOf("name");
    const phoneIdx = header.indexOf("phone");
    const emailIdx = header.indexOf("email");
    const genderIdx = header.indexOf("gender");
    const dobIdx = header.indexOf("dob");
    const addressIdx = header.indexOf("address");
    const notesIdx = header.indexOf("notes");
    const tagsIdx = header.indexOf("tags");

    if (nameIdx === -1 || phoneIdx === -1) {
      return apiError("CSV must include 'Name' and 'Phone' columns", "VALIDATION_ERROR", 400);
    }

    function parseCSVLine(line: string): string[] {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
        else current += ch;
      }
      result.push(current.trim());
      return result;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = parseCSVLine(lines[i]);
        const name = cols[nameIdx]?.replace(/^"|"$/g, "") || "";
        const phone = cols[phoneIdx]?.replace(/^"|"$/g, "") || "";
        if (!name || !phone) { skipped++; continue; }

        const [existing] = await db.select().from(customers)
          .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)))
          .limit(1);
        if (existing) { skipped++; continue; }

        const email = emailIdx >= 0 ? cols[emailIdx]?.replace(/^"|"$/g, "") || null : null;
        const gender = genderIdx >= 0 ? cols[genderIdx]?.replace(/^"|"$/g, "") || null : null;
        const dob = dobIdx >= 0 ? cols[dobIdx]?.replace(/^"|"$/g, "") || null : null;
        const address = addressIdx >= 0 ? cols[addressIdx]?.replace(/^"|"$/g, "") || null : null;
        const notes = notesIdx >= 0 ? cols[notesIdx]?.replace(/^"|"$/g, "") || null : null;
        const tagsStr = tagsIdx >= 0 ? cols[tagsIdx]?.replace(/^"|"$/g, "") || "" : "";
        const tags = tagsStr ? tagsStr.split(";").map((t: string) => t.trim()).filter(Boolean) : null;

        await db.insert(customers).values({
          tenantId,
          name,
          phone,
          email,
          gender,
          dob: dob ? new Date(dob) : null,
          address,
          notes,
          tags: tags && tags.length > 0 ? tags : null,
          isActive: true,
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
        skipped++;
      }
    }

    return apiSuccess({ imported, skipped, errors: errors.length > 0 ? errors : undefined });
  } catch {
    return apiError("Import failed", "INTERNAL_ERROR", 500);
  }
}
