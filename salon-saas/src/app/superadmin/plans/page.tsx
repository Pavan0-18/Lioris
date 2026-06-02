"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { BoneyardTable } from "@/components/ui/boneyard";

const ITEMS_PER_PAGE = 10;

export default function SuperadminPlansPage() {
  const [currentPage, setCurrentPage] = React.useState(1);

  const { data: plansData, isLoading } = useQuery({
    queryKey: ["superadmin-plans"],
    queryFn: () => fetch("/api/superadmin/plans").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const list = plansData?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Tier Pricing Plans</h2>
          <p className="text-sm text-muted-foreground">Manage active tiers of subscription models configured on the SaaS platform.</p>
        </div>
        <BoneyardTable rows={5} cols={3} />
      </div>
    );
  }

  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  const paginatedList = list.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
            {paginatedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                  No plans found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedList.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                  <TableCell className="text-xs font-bold">${p.basePrice} / {p.billingCycle}</TableCell>
                  <TableCell className="text-right text-xs">
                    <Badge variant={p.isActive ? "default" : "destructive"}>
                      {p.isActive ? "ACTIVE" : "ARCHIVED"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
