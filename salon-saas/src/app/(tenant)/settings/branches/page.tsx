"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function SettingsBranchesPage() {
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/tenant/branches").then(res => res.json())
  });

  const list = branchesData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Active Branches</h2>
        <p className="text-sm text-muted-foreground">Configure multi-branch locations and regional staff pools.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
        {list.map((b: any) => (
          <Card key={b.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">{b.name}</CardTitle>
              {b.isHQ && <Badge>HQ Crown</Badge>}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>{b.address}</p>
              <p className="mt-1">{b.city}, {b.state}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
