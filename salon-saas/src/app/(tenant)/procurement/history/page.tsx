"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { format } from "date-fns";
import Link from "next/link";
import { Search } from "lucide-react";

export default function PurchaseHistoryPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState("");
  const [vendorFilter, setVendorFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (search) queryParams.set("search", search);
  if (vendorFilter) queryParams.set("vendorId", vendorFilter);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data: vendorsData } = useQuery({
    queryKey: ["history-vendors-list"],
    queryFn: () => fetch("/api/tenant/vendors?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-history", page, pageSize, search, vendorFilter, startDate, endDate],
    queryFn: () => fetch(`/api/tenant/purchases?${queryParams.toString()}`).then((r) => r.json()),
  });

  const vendors = vendorsData?.data || [];
  const result = data?.data || { data: [], total: 0 };
  const items = result.data || [];
  const total = result.total || 0;

  const columns: Column<any>[] = [
    { header: "Purchase #", accessor: (item) => (
      <Link href={`/procurement/purchases/${item.id}`} className="font-mono text-sm hover:underline">
        {item.invoiceNumber || item.id.slice(0, 8)}
      </Link>
    ), className: "min-w-[120px]" },
    { header: "Vendor", accessor: (item) => (
      <span className="font-medium text-sm">{item.vendorName || "Unknown"}</span>
    ), sortKey: "vendorName", className: "min-w-[140px]" },
    { header: "Date", accessor: (item) => format(new Date(item.purchaseDate), "PP"), sortKey: "purchaseDate", className: "text-sm text-muted-foreground" },
    { header: "Amount", accessor: (item) => `$${item.totalAmount?.toFixed(2)}`, sortKey: "totalAmount", className: "text-sm font-medium text-right" },
    { header: "Items", accessor: (item) => (
      <span className="text-sm">{item.itemCount ?? 0}</span>
    ), className: "text-center" },
    { header: "Status", accessor: (item) => (
      <Badge variant={item.status === "received" ? "default" : "secondary"} className="text-xs capitalize">
        {item.status || "pending"}
      </Badge>
    ) },
    { header: "Created", accessor: (item) => format(new Date(item.createdAt), "PP"), className: "text-xs text-muted-foreground" },
  ];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase History</h2>
          <p className="text-sm text-muted-foreground">View all purchase transactions with vendor, product, and date range filters.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor or invoice..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <select
                  value={vendorFilter}
                  onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">From:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="h-8 w-36"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">To:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="h-8 w-36"
                  />
                </div>
                {(startDate || endDate || vendorFilter || search) && (
                  <button
                    onClick={() => { setSearch(""); setVendorFilter(""); setStartDate(""); setEndDate(""); setPage(1); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
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
                exportFilename="purchase-history"
                emptyMessage="No purchase orders found."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
