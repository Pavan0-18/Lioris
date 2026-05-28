import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminSidebar } from "@/components/layouts/superadmin-sidebar";
import { AmbientContent } from "@/components/ambient-content";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login?type=superadmin");
  }

  return (
    <div className="flex h-screen">
      <SuperAdminSidebar />
      <AmbientContent>{children}</AmbientContent>
    </div>
  );
}
