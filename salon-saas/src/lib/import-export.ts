import { db } from "@/lib/db";
import { entityRecords } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateRecord, type EntityField } from "@/lib/entities/engine";
import { emitDomainEvent } from "@/lib/workflows/engine";
import { logAudit } from "@/lib/auth-utils";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function coerceCsvValue(field: EntityField, raw: string): any {
  if (raw === "" || raw === undefined || raw === null) return undefined;
  switch (field.type) {
    case "number":
    case "currency":
    case "percentage":
    case "rating": {
      const num = parseFloat(raw.replace(/,/g, ""));
      return Number.isFinite(num) ? num : raw;
    }
    case "boolean": {
      const t = raw.trim().toLowerCase();
      if (["true", "yes", "y", "1"].includes(t)) return true;
      if (["false", "no", "n", "0"].includes(t)) return false;
      return raw;
    }
    case "multiselect":
      return raw.split("|").map((s) => s.trim()).filter(Boolean);
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    default:
      return raw.trim();
  }
}

export async function exportEntityCsv(tenantId: string, entityKey: string) {
  const { entity, fields } = await getEntityWithFields(tenantId, entityKey);
  const records = await db
    .select()
    .from(entityRecords)
    .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.entityId, entity.id)))
    .orderBy(asc(entityRecords.createdAt));

  const columns = [
    { key: "id", label: "id" },
    ...fields.map((f) => ({ key: f.key, label: f.label })),
    { key: "_createdAt", label: "createdAt" },
  ];
  const rows = records.map((r) => ({
    id: r.id,
    ...(r.fieldValues as Record<string, any>),
    _createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
  }));

  return { csv: toCsv(rows, columns), entity, fields, count: records.length };
}

async function findDuplicate(tenantId: string, entityId: string, fields: EntityField[], values: Record<string, any>) {
  for (const field of fields) {
    if (!field.unique) continue;
    const value = values[field.key];
    if (value === undefined || value === null || value === "") continue;
    const path = sql`${entityRecords.fieldValues}->>${field.key}`;
    const [dup] = await db.select({ id: entityRecords.id })
      .from(entityRecords)
      .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.entityId, entityId), eq(path, String(value))))
      .limit(1);
    if (dup) return `${field.label} must be unique`;
  }
  return null;
}

export async function importEntityCsv(
  tenantId: string,
  userId: string,
  entityKey: string,
  csvText: string
): Promise<{ imported: number; failed: number; errors: { row: number; message: string }[]; entity: any }> {
  const { entity, fields } = await getEntityWithFields(tenantId, entityKey);
  const fieldDefs = fields as EntityField[];

  const parsed = parseCsv(csvText);
  if (parsed.length === 0) {
    const error = new Error("CSV file is empty") as any;
    error.code = "INVALID_INPUT";
    throw error;
  }

  const header = parsed[0].map((h) => h.trim());
  const labelToKey = new Map(fieldDefs.map((f) => [f.label.toLowerCase(), f.key]));
  labelToKey.set("id", "id");
  const columns = header.map((h) => labelToKey.get(h.toLowerCase()) ?? h);

  const errors: { row: number; message: string }[] = [];
  let imported = 0;

  for (let idx = 0; idx < parsed.length - 1; idx++) {
    const rawRow = parsed[idx + 1];
    const values: Record<string, any> = {};

    columns.forEach((key, ci) => {
      if (!key || key === "id") return;
      const raw = rawRow[ci] ?? "";
      const field = fieldDefs.find((f) => f.key === key);
      values[key] = field ? coerceCsvValue(field, raw) : raw;
    });

    const { errors: valErrors, normalized } = validateRecord(fieldDefs, values);
    if (valErrors.length > 0) {
      errors.push({ row: idx + 2, message: valErrors.map((e) => e.message).join("; ") });
      continue;
    }

    for (const field of fieldDefs) {
      if (field.defaultValue && normalized[field.key] === undefined) {
        normalized[field.key] = field.defaultValue;
      }
    }

    const dupMessage = await findDuplicate(tenantId, entity.id, fieldDefs, normalized);
    if (dupMessage) {
      errors.push({ row: idx + 2, message: dupMessage });
      continue;
    }

    try {
      const [inserted] = await db.insert(entityRecords).values({
        tenantId,
        entityId: entity.id,
        fieldValues: normalized,
        createdById: userId,
        updatedById: userId,
      }).returning();
      imported++;
      await emitDomainEvent("record.created", entityKey, { id: inserted.id, ...normalized }, {
        tenantId,
        actorId: userId,
        extra: { recordId: inserted.id },
      });
    } catch (err: any) {
      errors.push({ row: idx + 2, message: err?.message ?? "Database error" });
    }
  }

  await logAudit(tenantId, userId, "IMPORT", "ENTITY_RECORD", entity.id, {
    entityKey,
    imported,
    failed: errors.length,
  });

  return { imported, failed: errors.length, errors, entity };
}