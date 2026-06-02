import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminDashboardShell } from "@/components/layouts/superadmin-sidebar";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login?type=superadmin");
  }

  return <SuperAdminDashboardShell>{children}</SuperAdminDashboardShell>;
}
