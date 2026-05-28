"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { StaffTable } from "@/components/staff/staff-table";
import { AddStaffModal } from "@/components/staff/add-staff-modal";

export default function StaffPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const { data: staffData, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json())
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/tenant/branches").then(res => res.json())
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetch("/api/tenant/services").then(res => res.json())
  });

  const staffList = staffData?.data || [];
  const branches = branchesData?.data || [];
  const services = servicesData?.data || [];

  return (
    <FeatureGate feature="STAFF_MGMT">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-sm text-muted-foreground">Manage your stylist team, commissions, and working slots.</p>
        </div>

        <StaffTable staffList={staffList} onAddClick={() => setIsAddOpen(true)} />

        <AddStaffModal
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          branches={branches}
          services={services}
          onSuccess={refetch}
        />
      </div>
    </FeatureGate>
  );
}
