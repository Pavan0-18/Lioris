"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewPurchasePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: vendorsData } = useQuery({
    queryKey: ["procurement-vendors-list"],
    queryFn: () => fetch("/api/tenant/vendors?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData } = useQuery({
    queryKey: ["procurement-products-list"],
    queryFn: () => fetch("/api/tenant/inventory/products?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const vendors = vendorsData?.data || [];
  const products = productsData?.data || [];

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create purchase order");
      toast.success("Purchase order created and stock updated");
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      router.push("/procurement/purchases");
    } catch {
      toast.error("Failed to create purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Purchase Order</h2>
          <p className="text-sm text-muted-foreground">Record a new inventory purchase.</p>
        </div>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PurchaseForm
              vendors={vendors}
              products={products}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
