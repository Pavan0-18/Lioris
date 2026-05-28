"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export default function CustomersCRMPage() {
  const [search, setSearch] = React.useState("");

  const { data: customersData } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => fetch(`/api/tenant/customers?search=${search}`).then(res => res.json())
  });

  const list = customersData?.data || [];

  return (
    <FeatureGate feature="CRM">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customer Database</h2>
          <p className="text-sm text-muted-foreground">Track profiles, appointment histories, and loyalty metrics.</p>
        </div>

        <div className="max-w-sm">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Loyalty Points</TableHead>
                  <TableHead className="text-right">Active Listings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      No customer profiles registered.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-sm">{c.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="text-xs font-semibold text-teal-600">{c.loyalty_points} pts</TableCell>
                      <TableCell className="text-right text-xs">ACTIVE</TableCell>
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
