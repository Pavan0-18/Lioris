"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BoneyardCard } from "@/components/ui/boneyard";
import { Package, DollarSign, AlertTriangle, ArrowRightLeft, PackagePlus, List, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function InventoryDashboardPage() {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => fetch("/api/tenant/inventory/stock-summary").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <FeatureGate feature="INVENTORY">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h2>
              <p className="text-sm text-muted-foreground">Overview of stock, value, and activity.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <BoneyardCard rows={2} />
            <BoneyardCard rows={2} />
            <BoneyardCard rows={2} />
            <BoneyardCard rows={2} />
          </div>
          <BoneyardCard rows={4} />
        </div>
      </FeatureGate>
    );
  }

  const summary = summaryData?.data;

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h2>
            <p className="text-sm text-muted-foreground">Overview of stock, value, and activity.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory/products/new">
                <PackagePlus className="h-4 w-4 mr-2" />
                Add Product
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/inventory/products">
                <List className="h-4 w-4 mr-2" />
                View Products
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalProducts ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(summary?.inventoryValue ?? 0).toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{summary?.lowStockCount ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.recentTransactions?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/inventory/products">
                    <List className="h-4 w-4 mr-2" />
                    All Products
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/inventory/transactions">
                    <History className="h-4 w-4 mr-2" />
                    Stock History
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/inventory/adjustments">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Adjust Stock
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/inventory/products/new">
                    <PackagePlus className="h-4 w-4 mr-2" />
                    New Product
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.recentTransactions?.length > 0 ? (
                <div className="space-y-3">
                  {summary.recentTransactions.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium capitalize">{t.type}</span>
                        <span className="text-muted-foreground ml-2">{t.reference || ""}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(t.createdAt), "PPp")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent transactions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
}
