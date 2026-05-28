import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TenantSidebar } from "@/components/layouts/tenant-sidebar";
import { AmbientContent } from "@/components/ambient-content";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const [tenant] = await db.select({ onboardingDone: tenants.onboardingDone })
    .from(tenants)
    .where(eq(tenants.id, session.user.tenantId || ""))
    .limit(1);

  if (tenant && !tenant.onboardingDone) {
    redirect("/setup");
  }

  return (
    <div className="flex h-screen">
      <TenantSidebar />
      <AmbientContent>{children}</AmbientContent>
    </div>
  );
}
