"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchFilters } from "@/components/inventory/search-filters";
import { ProductTable } from "@/components/inventory/product-table";
import { ProductDialog } from "@/components/inventory/product-dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function ProductsPage() {
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<any>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (brandId) queryParams.set("brandId", brandId);
  if (status) queryParams.set("status", status);

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ["products", search, categoryId, brandId, status],
    queryFn: () =>
      fetch(`/api/tenant/inventory/products?${queryParams.toString()}`).then((r) => r.json()),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => fetch("/api/tenant/inventory/categories").then((r) => r.json()),
  });

  const { data: brandsData } = useQuery({
    queryKey: ["product-brands"],
    queryFn: () => fetch("/api/tenant/inventory/brands").then((r) => r.json()),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["product-units"],
    queryFn: () => fetch("/api/tenant/inventory/units").then((r) => r.json()),
  });

  const productsList = productsData?.data || [];
  const categoriesList = categoriesData?.data || [];
  const brandsList = brandsData?.data || [];
  const unitsList = unitsData?.data || [];

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
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

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
                onSearchChange={setSearch}
                categoryId={categoryId}
                onCategoryChange={setCategoryId}
                brandId={brandId}
                onBrandChange={setBrandId}
                status={status}
                onStatusChange={setStatus}
                categories={categoriesList}
                brands={brandsList}
              />
              <ProductTable
                products={productsList}
                stockMap={stockMap}
                isLoading={isLoading}
                onEdit={openEditDialog}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
          queryClient.invalidateQueries({ queryKey: ["product-categories"] });
          queryClient.invalidateQueries({ queryKey: ["product-brands"] });
          queryClient.invalidateQueries({ queryKey: ["product-units"] });
        }}
      />
    </FeatureGate>
  );
}
