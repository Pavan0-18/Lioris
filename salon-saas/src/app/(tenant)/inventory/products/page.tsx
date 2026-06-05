"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchFilters } from "@/components/inventory/search-filters";
import { ProductDialog } from "@/components/inventory/product-dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Plus, AlertTriangle, Pencil, Trash2 } from "lucide-react";

export default function ProductsPage() {
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<any>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (brandId) queryParams.set("brandId", brandId);
  if (status) queryParams.set("status", status);
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ["products", search, categoryId, brandId, status, page, pageSize],
    queryFn: () =>
      fetch(`/api/tenant/inventory/products?${queryParams.toString()}`).then((r) => r.json()),
  });

  const { data: lookupsData } = useQuery({
    queryKey: ["inventory-lookups"],
    queryFn: () =>
      fetch("/api/tenant/batch?resources=categories,brands,units", {
        method: "GET",
      }).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const categoriesList = lookupsData?.data?.categories || [];
  const brandsList = lookupsData?.data?.brands || [];
  const unitsList = lookupsData?.data?.units || [];

  const result = productsData?.data || { data: [], total: 0, page: 1, pageSize: 25 };
  const productsList = result.data || [];
  const total = result.total || 0;

  const { data: stockData } = useQuery({
    queryKey: ["all-stock"],
    queryFn: () => fetch("/api/tenant/inventory/stock-summary").then((r) => r.json()),
  });

  const stockMap: Record<string, number> = {};
  if (stockData?.data?.lowStockProducts) {
    stockData.data.lowStockProducts.forEach((p: any) => {
      stockMap[p.productId] = p.stock;
    });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tenant/inventory/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Product deleted");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const handleSave = async (data: any) => {
    const isEdit = !!editingProduct;
    const url = isEdit
      ? `/api/tenant/inventory/products/${editingProduct.id}`
      : "/api/tenant/inventory/products";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to save product");

    toast.success(isEdit ? "Product updated" : "Product created");
    refetch();
    queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const columns: Column<any>[] = [
    { header: "Product", accessor: (item) => {
      const stock = stockMap[item.id] ?? 0;
      const isLowStock = stock <= item.reorderLevel;
      return (
        <div className="flex items-center gap-2">
          {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
          <div>
            <p className="font-medium text-sm">{item.name}</p>
            {item.expiryDate && (
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(item.expiryDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      );
    }, className: "min-w-[200px]" },
    { header: "SKU", accessor: "sku", className: "text-xs font-mono" },
    { header: "Price", accessor: (item) => `$${item.sellingPrice?.toFixed(2)}`, className: "text-sm" },
    { header: "Stock", accessor: (item) => {
      const stock = stockMap[item.id] ?? 0;
      const isLowStock = stock <= item.reorderLevel;
      return (
        <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-xs">
          {stock} {stock === 1 ? "unit" : "units"}
        </Badge>
      );
    } },
    { header: "Status", accessor: (item) => (
      <Badge variant={item.isActive ? "default" : "outline"} className="text-xs">
        {item.isActive ? "Active" : "Inactive"}
      </Badge>
    ) },
    { header: "Actions", accessor: (item) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
          <Pencil className="h-4 w-4" />
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
            <h2 className="text-2xl font-bold tracking-tight">Products</h2>
            <p className="text-sm text-muted-foreground">Manage your inventory products.</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <SearchFilters
                search={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                categoryId={categoryId}
                onCategoryChange={(v) => { setCategoryId(v); setPage(1); }}
                brandId={brandId}
                onBrandChange={(v) => { setBrandId(v); setPage(1); }}
                status={status}
                onStatusChange={(v) => { setStatus(v); setPage(1); }}
                categories={categoriesList}
                brands={brandsList}
              />
              <DataTable
                columns={columns}
                data={productsList}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                exportFilename="products"
                emptyMessage="No products found."
              />
            </div>
          </CardContent>
        </Card>

        <ProductDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}
          product={editingProduct}
          categories={categoriesList}
          brands={brandsList}
          units={unitsList}
          onSave={handleSave}
          onLookupsChange={() => {
            queryClient.invalidateQueries({ queryKey: ["inventory-lookups"] });
          }}
        />
      </div>
    </FeatureGate>
  );
}
