"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { StaffTable } from "@/components/staff/staff-table";
import { BoneyardPage } from "@/components/ui/boneyard";

export default function SettingsTeamPage() {
  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const staffList = staffData?.data || [];

  if (isLoading) {
    return <BoneyardPage />;
  }

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
