"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { DataTable, Column } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const statusBadge: Record<string, "default" | "secondary" | "outline"> = {
  pending: "secondary",
  received: "default",
  partial: "outline",
};

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [showNewPurchase, setShowNewPurchase] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchases", search, statusFilter, page, pageSize],
    queryFn: () => fetch(`/api/tenant/purchases?${queryParams.toString()}`).then((r) => r.json()),
  });

  const { data: vendorsListData } = useQuery({
    queryKey: ["purchases-vendors-list"],
    queryFn: () => fetch("/api/tenant/vendors?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData } = useQuery({
    queryKey: ["purchases-products-list"],
    queryFn: () => fetch("/api/tenant/inventory/products?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const result = data?.data || { data: [], total: 0 };
  const orders = result.data || [];
  const total = result.total || 0;
  const vendorsList = vendorsListData?.data || [];
  const products = productsData?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/tenant/purchases/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Purchase order deleted"); refetch(); queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] }); },
    onError: () => toast.error("Failed to delete purchase order"),
  });

  const handleCreate = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Purchase order created and stock updated");
      setShowNewPurchase(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    } catch { toast.error("Failed to create purchase order"); }
    finally { setIsSubmitting(false); }
  };

  const columns: Column<any>[] = [
    { header: "Purchase #", accessor: (item) => (
      <Link href={`/procurement/purchases/${item.id}`} className="font-mono text-sm hover:underline">
        {item.invoiceNumber || item.id.slice(0, 8)}
      </Link>
    ), sortKey: "invoiceNumber", className: "min-w-[120px]" },
    { header: "Vendor", accessor: (item) => item.vendorName || "Unknown", sortKey: "vendorName", className: "text-sm font-medium" },
    { header: "Date", accessor: (item) => format(new Date(item.purchaseDate), "PP"), sortKey: "purchaseDate", className: "text-sm text-muted-foreground" },
    { header: "Total Amount", accessor: (item) => `$${item.totalAmount?.toFixed(2)}`, sortKey: "totalAmount", className: "text-sm font-medium text-right" },
    { header: "Items", accessor: (item) => (
      <span className="font-medium text-sm">{item.itemCount ?? 0}</span>
    ), className: "text-center" },
    { header: "Status", accessor: (item) => (
      <Badge variant={statusBadge[item.status] || "outline"} className="text-xs capitalize">
        {item.status || "pending"}
      </Badge>
    ) },
    { header: "Actions", accessor: (item) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/procurement/purchases/${item.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ), className: "text-right" },
  ];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Purchases</h2>
            <p className="text-sm text-muted-foreground">Manage purchase orders and track inventory purchases.</p>
          </div>
          <Button onClick={() => setShowNewPurchase(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor or invoice..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <DataTable
                columns={columns}
                data={orders}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                exportFilename="purchases"
                emptyMessage="No purchase orders found."
              />
            </div>
          </CardContent>
        </Card>

        <Dialog open={showNewPurchase} onOpenChange={setShowNewPurchase}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Purchase Order</DialogTitle>
              <DialogDescription>Record a new inventory purchase.</DialogDescription>
            </DialogHeader>
            <PurchaseForm
              vendors={vendorsList}
              products={products}
              onSubmit={handleCreate}
              isSubmitting={isSubmitting}
              onCancel={() => setShowNewPurchase(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
