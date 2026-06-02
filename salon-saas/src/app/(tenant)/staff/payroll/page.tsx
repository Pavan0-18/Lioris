"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BoneyardTable } from "@/components/ui/boneyard";

export default function PayrollDashboardPage() {
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [year, setYear] = React.useState(new Date().getFullYear());

  const { data: payrollData, isLoading, refetch } = useQuery({
    queryKey: ["payroll", month, year],
    queryFn: () => fetch(`/api/tenant/payroll?month=${month}&year=${year}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const payrollItems = payrollData?.data || [];

  if (isLoading) {
    return (
      <FeatureGate feature="PAYROLL">
        <BoneyardTable rows={5} cols={5} />
      </FeatureGate>
    );
  }

  const handleGeneratePayroll = async () => {
    try {
      const res = await fetch("/api/tenant/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dispatched background job to calculate salaries & commissions.");
      refetch();
    } catch {
      toast.error("Failed to enqueue payroll generation.");
    }
  };

  return (
    <FeatureGate feature="PAYROLL">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Stylist Payroll</h2>
            <p className="text-sm text-muted-foreground">Calculate commissions, base wages, and generate drafts.</p>
          </div>
          <Button size="sm" onClick={handleGeneratePayroll}>Run Payroll Generator</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Salary & Commission Drafts — {month}/{year}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Stylist</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                      No payroll records generated for this month. Click "Run Payroll Generator".
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollItems.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-sm">{p.staff?.user?.name}</TableCell>
                      <TableCell className="text-xs font-semibold">${p.baseSalary}</TableCell>
                      <TableCell className="text-xs font-semibold text-primary">${p.commissions}</TableCell>
                      <TableCell className="text-xs font-bold text-teal-600">${p.netSalary}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => toast.success("Draft approved")}>
                          Approve Draft
                        </Button>
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
