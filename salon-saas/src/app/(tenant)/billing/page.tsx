"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BoneyardTable } from "@/components/ui/boneyard";

export default function BillingInvoicePage() {
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetch("/api/tenant/billing/invoices").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const list = invoicesData?.data || [];

  if (isLoading) {
    return (
      <FeatureGate feature="BILLING">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Billing & Invoices</h2>
            <p className="text-sm text-muted-foreground">Manage cash, card, and UPI salon invoices.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Invoices Registry</CardTitle>
            </CardHeader>
            <CardContent>
              <BoneyardTable rows={5} cols={4} />
            </CardContent>
          </Card>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature="BILLING">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing & Invoices</h2>
          <p className="text-sm text-muted-foreground">Manage cash, card, and UPI salon invoices.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoices Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      No invoices recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-sm">{inv.invoiceNo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.customer?.name}</TableCell>
                      <TableCell className="text-xs font-semibold">${inv.total}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{inv.status.toUpperCase()}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
