"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SuperadminFeaturesPage() {
  const { data: featuresData } = useQuery({
    queryKey: ["superadmin-features"],
    queryFn: () => fetch("/api/superadmin/features").then(res => res.json())
  });

  const list = featuresData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Core Features Mapping</h2>
        <p className="text-sm text-muted-foreground">Manage modular features categorized as core, add-on, or premium.</p>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature Name</TableHead>
              <TableHead>Key ID</TableHead>
              <TableHead className="text-right">Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-semibold text-sm">{f.name}</TableCell>
                <TableCell className="text-xs font-mono">{f.key}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{f.category.toUpperCase()}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
