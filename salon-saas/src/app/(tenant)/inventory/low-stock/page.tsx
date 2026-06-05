"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LowStockPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [categoryId, setCategoryId] = React.useState("");

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (categoryId) queryParams.set("categoryId", categoryId);

  const { data, isLoading } = useQuery({
    queryKey: ["low-stock", page, pageSize, categoryId],
    queryFn: () =>
      fetch(`/api/tenant/inventory/low-stock?${queryParams.toString()}`).then((r) => r.json()),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-for-low-stock"],
    queryFn: () => fetch("/api/tenant/inventory/categories").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData?.data || [];
  const result = data?.data || { data: [], total: 0, page: 1, pageSize: 25 };
  const items = result.data || [];
  const total = result.total || 0;

  const columns: Column<any>[] = [
    { header: "Product", accessor: (item) => (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <div>
          <p className="font-medium text-sm">{item.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
        </div>
      </div>
    ), className: "min-w-[200px]" },
    { header: "Category", accessor: (item) => item.categoryName || "-", className: "text-sm" },
    { header: "Stock", accessor: (item) => (
      <Badge variant="destructive" className="text-xs">
        {item.stock} units
      </Badge>
    ), className: "text-sm" },
    { header: "Reorder Level", accessor: "reorderLevel", className: "text-sm" },
    { header: "Selling Price", accessor: (item) => `$${item.sellingPrice?.toFixed(2)}`, className: "text-sm" },
    { header: "Cost Price", accessor: (item) => `$${item.costPrice?.toFixed(2)}`, className: "text-sm" },
  ];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Low Stock Alerts</h2>
            <p className="text-sm text-muted-foreground">Products at or below their reorder level.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Low Stock Products</CardTitle>
              {categories.length > 0 && (
                <select
                  value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                  className="bg-transparent border border-border rounded-md px-2 py-1 text-xs"
                >
                  <option value="">All Categories</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                exportFilename="low-stock-products"
                emptyMessage="No low stock products found."
            />
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
