"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SuperadminPlansPage() {
  const { data: plansData } = useQuery({
    queryKey: ["superadmin-plans"],
    queryFn: () => fetch("/api/superadmin/plans").then(res => res.json())
  });

  const list = plansData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Tier Pricing Plans</h2>
        <p className="text-sm text-muted-foreground">Manage active tiers of subscription models configured on the SaaS platform.</p>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Tier Name</TableHead>
              <TableHead>Billing Price</TableHead>
              <TableHead className="text-right">Active Listings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                <TableCell className="text-xs font-bold">${p.basePrice} / {p.billingCycle}</TableCell>
                <TableCell className="text-right text-xs">
                  <Badge variant={p.isActive ? "default" : "destructive"}>
                    {p.isActive ? "ACTIVE" : "ARCHIVED"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
