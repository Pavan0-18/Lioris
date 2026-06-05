"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function ProductUsagePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formValues, setFormValues] = React.useState({ productId: "", quantityUsed: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ["product-usage", page, pageSize],
    queryFn: () =>
      fetch(`/api/tenant/service-product-usage`).then((r) => r.json()),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-for-usage"],
    queryFn: () => fetch("/api/tenant/inventory/products?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services-for-usage"],
    queryFn: () => fetch("/api/tenant/services").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const products = productsData?.data?.data || productsData?.data || [];
  const services = servicesData?.data || [];
  const usageList = data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tenant/service-product-usage/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Usage record deleted");
      queryClient.invalidateQueries({ queryKey: ["product-usage"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
    onError: () => toast.error("Failed to delete usage record"),
  });

  const handleCreate = async () => {
    if (!formValues.productId) {
      toast.error("Please select a product");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/service-product-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      if (!res.ok) throw new Error("Failed to create usage record");
      toast.success("Product usage record created");
      setDialogOpen(false);
      setFormValues({ productId: "", quantityUsed: 1 });
      queryClient.invalidateQueries({ queryKey: ["product-usage"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    } catch {
      toast.error("Failed to create usage record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    { header: "Product", accessor: (item) => (
      <div>
        <p className="font-medium text-sm">{item.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{item.productSku}</p>
      </div>
    ), className: "min-w-[160px]" },
    { header: "Quantity Used", accessor: (item) => `${item.quantityUsed} ${item.unitName || "units"}`, className: "text-sm" },
    { header: "Created", accessor: (item) => new Date(item.createdAt).toLocaleDateString(), className: "text-sm text-muted-foreground" },
    { header: "Actions", accessor: (item) => (
      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    ), className: "text-right" },
  ];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Product Usage Tracking</h2>
            <p className="text-sm text-muted-foreground">Track which products are used for services.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Usage Record
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Service-Product Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={usageList}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              exportFilename="product-usage"
              emptyMessage="No product usage records found."
            />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Usage Record</DialogTitle>
              <DialogDescription>Link a product to a service with quantity used.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={formValues.productId}
                  onValueChange={(val) => setFormValues((p) => ({ ...p, productId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity Used</Label>
                <Input
                  type="number"
                  min="1"
                  value={formValues.quantityUsed}
                  onChange={(e) => setFormValues((p) => ({ ...p, quantityUsed: Number(e.target.value) }))}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Usage Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
