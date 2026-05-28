"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

export default function ReportsDashboardPage() {
  const { data: reportsData } = useQuery({
    queryKey: ["reports"],
    queryFn: () => fetch("/api/tenant/reports").then(res => res.json())
  });

  const metrics = reportsData?.data || { revenue: [], topServices: [] };

  return (
    <FeatureGate feature="ANALYTICS_ADV">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Analytics</h2>
          <p className="text-sm text-muted-foreground">View growth curves and stylist productivity charts.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Services</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead className="text-right">Revenue Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">
                        Not enough transactions to calculate distributions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.topServices.map((s: any) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">${s.amount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
}
