"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function InventoryControlPage() {
  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Manager</h2>
          <p className="text-sm text-muted-foreground">Track retail products and backbar salon items.</p>
        </div>

        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle>Coming Soon!</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The Inventory Control dashboard is currently undergoing optimizations and will be rolled out in the next sprint release!
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
