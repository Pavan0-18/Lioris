"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2, PackagePlus, Loader2 } from "lucide-react";
import { createServiceProductUsageSchema } from "@/lib/validators/inventory";

export default function ServiceProductsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: serviceData } = useQuery({
    queryKey: ["services-list"],
    queryFn: () => fetch("/api/tenant/services").then((r) => r.json()),
  });
  const service = serviceData?.data?.find((s: any) => s.id === params.id);

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["service-product-usage", params.id],
    queryFn: () => fetch(`/api/tenant/service-product-usage?serviceId=${params.id}`).then((r) => r.json()),
    enabled: !!params.id,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-for-usage"],
    queryFn: () => fetch("/api/tenant/inventory/products").then((r) => r.json()),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["units-for-usage"],
    queryFn: () => fetch("/api/tenant/inventory/units").then((r) => r.json()),
  });

  const products = productsData?.data || [];
  const units = unitsData?.data || [];
  const usageList = usageData?.data || [];

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createServiceProductUsageSchema),
    defaultValues: { serviceId: params.id as string, productId: "", quantityUsed: 1, unitId: "" },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tenant/service-product-usage/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-product-usage"] });
      toast.success("Product usage removed");
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/service-product-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serviceId: params.id }),
      });
      if (!res.ok) throw new Error("Failed to add product usage");
      toast.success("Product usage added");
      reset({ serviceId: params.id as string, productId: "", quantityUsed: 1, unitId: "" });
      queryClient.invalidateQueries({ queryKey: ["service-product-usage"] });
    } catch {
      toast.error("Failed to add product usage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Service Recipe: {service?.name || "Loading..."}
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure products consumed when this service is performed.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add Product Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={watch("productId")} onValueChange={(val) => setValue("productId", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.productId && <p className="text-xs text-destructive">{errors.productId.message as string}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Quantity Used</Label>
                    <Input type="number" step="0.01" min="0" {...register("quantityUsed", { valueAsNumber: true })} />
                    {errors.quantityUsed && <p className="text-xs text-destructive">{errors.quantityUsed.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={watch("unitId")} onValueChange={(val) => setValue("unitId", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.abbreviation || u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Add to Recipe
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Recipe ({usageList.length} products)</CardTitle>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : usageList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No products configured. Add products to build the service recipe.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageList.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">{u.productName}</TableCell>
                        <TableCell className="text-right">{u.quantityUsed}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{u.unitName || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
}
