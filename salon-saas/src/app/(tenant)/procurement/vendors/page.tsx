"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VendorForm } from "@/components/vendors/vendor-form";
import { DataTable, Column } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Phone, Mail } from "lucide-react";

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [showAddVendor, setShowAddVendor] = React.useState(false);
  const [editingVendorId, setEditingVendorId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["vendors", search, statusFilter, page, pageSize],
    queryFn: () => fetch(`/api/tenant/vendors?${queryParams.toString()}`).then((r) => r.json()),
  });

  const { data: vendorEditData } = useQuery({
    queryKey: ["vendor-edit", editingVendorId],
    queryFn: () => fetch(`/api/tenant/vendors/${editingVendorId}`).then((r) => r.json()),
    enabled: !!editingVendorId,
  });

  const result = data?.data || { data: [], total: 0 };
  const vendors = result.data || [];
  const total = result.total || 0;
  const editingVendor = vendorEditData?.data;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/tenant/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Vendor deleted"); refetch(); queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] }); },
    onError: () => toast.error("Failed to delete vendor"),
  });

  const handleCreate = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Vendor created");
      setShowAddVendor(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["procurement-vendors-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    } catch { toast.error("Failed to create vendor"); }
    finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (formData: any) => {
    if (!editingVendorId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/vendors/${editingVendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Vendor updated");
      setEditingVendorId(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["procurement-vendors-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    } catch { toast.error("Failed to update vendor"); }
    finally { setIsSubmitting(false); }
  };

  const columns: Column<any>[] = [
    { header: "Vendor Name", accessor: (item) => (
      <div>
        <p className="font-medium text-sm">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.contactPerson || "-"}</p>
      </div>
    ), sortKey: "name", className: "min-w-[160px]" },
    { header: "Contact Person", accessor: (item) => item.contactPerson || "-", className: "text-sm" },
    { header: "Phone", accessor: (item) => item.phone ? (
      <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{item.phone}</span>
    ) : "-", className: "text-sm" },
    { header: "Email", accessor: (item) => item.email ? (
      <span className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" />{item.email}</span>
    ) : "-", className: "text-sm" },
    { header: "Address", accessor: (item) => item.address || "-", className: "text-sm text-muted-foreground max-w-[150px] truncate" },
    { header: "Products Supplied", accessor: (item) => (
      <span className="font-medium text-sm">{item.productsSupplied ?? 0}</span>
    ), className: "text-center" },
    { header: "Status", accessor: (item) => (
      <Badge variant={item.isActive === "true" ? "default" : "secondary"} className="text-xs">
        {item.isActive === "true" ? "Active" : "Inactive"}
      </Badge>
    ) },
    { header: "Actions", accessor: (item) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={() => setEditingVendorId(item.id)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ), className: "text-right" },
  ];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Vendors</h2>
            <p className="text-sm text-muted-foreground">Manage suppliers and vendors.</p>
          </div>
          <Button onClick={() => setShowAddVendor(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <DataTable
                columns={columns}
                data={vendors}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                exportFilename="vendors"
                emptyMessage="No vendors found."
              />
            </div>
          </CardContent>
        </Card>

        <Dialog open={showAddVendor} onOpenChange={setShowAddVendor}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Vendor</DialogTitle>
              <DialogDescription>Add a new supplier or vendor.</DialogDescription>
            </DialogHeader>
            <VendorForm onSubmit={handleCreate} isSubmitting={isSubmitting} onCancel={() => setShowAddVendor(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingVendorId} onOpenChange={(open) => { if (!open) setEditingVendorId(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
              <DialogDescription>Update vendor details.</DialogDescription>
            </DialogHeader>
            {editingVendor ? (
              <VendorForm
                defaultValues={{
                  name: editingVendor.name,
                  contactPerson: editingVendor.contactPerson || "",
                  phone: editingVendor.phone || "",
                  email: editingVendor.email || "",
                  address: editingVendor.address || "",
                  notes: editingVendor.notes || "",
                }}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                onCancel={() => setEditingVendorId(null)}
              />
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
