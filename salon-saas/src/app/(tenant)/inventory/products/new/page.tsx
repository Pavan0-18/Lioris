"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FeatureGate } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { BoneyardPage } from "@/components/ui/boneyard";
import { ProductForm } from "@/components/inventory/product-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();

  const { data: lookupsData, isLoading } = useQuery({
    queryKey: ["inventory-lookups"],
    queryFn: () =>
      fetch("/api/tenant/batch?resources=categories,brands,units", { method: "GET" }).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tenant/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save product");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Product created");
      router.push("/inventory/products");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <BoneyardPage />;
  }

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/inventory/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">New Product</h2>
            <p className="text-sm text-muted-foreground">Add a product to your inventory.</p>
          </div>
        </div>

        <ProductForm
          categories={lookupsData?.data?.categories || []}
          brands={lookupsData?.data?.brands || []}
          units={lookupsData?.data?.units || []}
          onSubmit={async (data) => saveMutation.mutateAsync(data)}
          isSubmitting={saveMutation.isPending}
        />
      </div>
    </FeatureGate>
  );
}