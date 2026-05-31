"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { createAdjustmentSchema } from "@/lib/validators/inventory";
import { Loader2 } from "lucide-react";

export default function AdjustmentsPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: productsData } = useQuery({
    queryKey: ["products-for-adjustment"],
    queryFn: () => fetch("/api/tenant/inventory/products").then((r) => r.json()),
  });

  const { refetch: refetchSummary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => fetch("/api/tenant/inventory/stock-summary").then((r) => r.json()),
    enabled: false,
  });

  const products = productsData?.data || [];

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createAdjustmentSchema),
    defaultValues: {
      productId: "",
      type: "adjustment" as const,
      quantity: 1,
      unitCost: undefined,
      reference: "",
      note: "",
    },
  });

  const productIdVal = watch("productId");
  const typeVal: string = watch("type");

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to record adjustment");
      toast.success("Stock adjustment recorded");
      reset();
      refetchSummary();
    } catch {
      toast.error("Failed to record adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock Adjustments</h2>
          <p className="text-sm text-muted-foreground">Record purchases, usage, wastage, or manual adjustments.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product</Label>
                  <Select value={productIdVal} onValueChange={(val) => setValue("productId", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.productId && <p className="text-xs text-destructive">{errors.productId.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select value={typeVal} onValueChange={(val) => setValue("type", val as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase (+)</SelectItem>
                      <SelectItem value="usage">Usage (-)</SelectItem>
                      <SelectItem value="wastage">Wastage (-)</SelectItem>
                      <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-destructive">{errors.type.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" min="1" {...register("quantity", { valueAsNumber: true })} />
                  {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message as string}</p>}
                </div>

                {typeVal === "purchase" && (
                  <div className="space-y-2">
                    <Label htmlFor="unitCost">Unit Cost</Label>
                    <Input id="unitCost" type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (e.g. PO#, Invoice#)</Label>
                  <Input id="reference" {...register("reference")} placeholder="Optional" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea id="note" {...register("note")} placeholder="Optional notes..." />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Transaction
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-green-600">Purchase (+)</p>
                  <p className="text-xs text-muted-foreground mt-1">Record stock received from suppliers. Increases inventory.</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-amber-600">Usage (-)</p>
                  <p className="text-xs text-muted-foreground mt-1">Products used in services or operations. Decreases inventory.</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-red-600">Wastage (-)</p>
                  <p className="text-xs text-muted-foreground mt-1">Damaged, expired, or lost products. Decreases inventory.</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-blue-600">Adjustment (+/-)</p>
                  <p className="text-xs text-muted-foreground mt-1">Manual corrections. Use positive for increases, negative for decreases.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
}
