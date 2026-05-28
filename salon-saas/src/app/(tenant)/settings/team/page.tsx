"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { StaffTable } from "@/components/staff/staff-table";

export default function SettingsTeamPage() {
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json())
  });

  const staffList = staffData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team Configuration</h2>
        <p className="text-sm text-muted-foreground">Administrative settings for stylus commission mappings.</p>
      </div>

      <StaffTable staffList={staffList} />
    </div>
  );
}
