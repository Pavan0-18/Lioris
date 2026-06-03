import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();

    const list = await db.select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      gender: customers.gender,
      dob: customers.dob,
      address: customers.address,
      notes: customers.notes,
      tags: customers.tags,
      loyaltyPoints: customers.loyaltyPoints,
      createdAt: customers.createdAt,
    })
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .orderBy(customers.name);

    const header = "Name,Phone,Email,Gender,DOB,Address,Notes,Tags,Loyalty Points,Created At";
    const rows = list.map((c) => {
      const tags = (c.tags || []).join("; ");
      const dob = c.dob ? c.dob.toISOString().split("T")[0] : "";
      const created = c.createdAt ? c.createdAt.toISOString().split("T")[0] : "";
      return `"${c.name}","${c.phone}","${c.email || ""}","${c.gender || ""}","${dob}","${(c.address || "").replace(/"/g, '""')}","${(c.notes || "").replace(/"/g, '""')}","${tags}","${c.loyaltyPoints}","${created}"`;
    }).join("\n");

    const csv = `\uFEFF${header}\n${rows}`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch {
    return apiError("Export failed", "INTERNAL_ERROR", 500);
  }
}
