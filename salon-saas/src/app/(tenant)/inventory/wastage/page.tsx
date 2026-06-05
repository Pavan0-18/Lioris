"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { createWastageSchema } from "@/lib/validators/inventory";
import { format } from "date-fns";

const reasonColors: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
  expired: "destructive",
  damaged: "secondary",
  lost: "secondary",
  spilled: "outline",
  other: "default",
};

export default function WastagePage() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: productsData } = useQuery({
    queryKey: ["products-for-wastage"],
    queryFn: () => fetch("/api/tenant/inventory/products?all=true").then((r) => r.json()),
  });

  const { data: wastageData, isLoading } = useQuery({
    queryKey: ["inventory-wastage"],
    queryFn: () => fetch("/api/tenant/inventory/wastage").then((r) => r.json()),
  });

  const { data: reportData } = useQuery({
    queryKey: ["wastage-report"],
    queryFn: () => fetch("/api/tenant/inventory/wastage-report").then((r) => r.json()),
  });

  const products = productsData?.data || [];
  const wastageList = wastageData?.data || [];
  const report = reportData?.data;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createWastageSchema),
    defaultValues: { productId: "", quantity: 1, reason: "damaged" as const, notes: "" },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/inventory/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to record wastage");
      toast.success("Wastage recorded");
      reset({ productId: "", quantity: 1, reason: "damaged", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["inventory-wastage"] });
      queryClient.invalidateQueries({ queryKey: ["wastage-report"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    } catch {
      toast.error("Failed to record wastage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Wastage Tracking</h2>
          <p className="text-sm text-muted-foreground">Track inventory losses due to damage, expiry, spills, or disposal.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Wastage</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report?.totalWastage ?? 0} units</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wastage Cost</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(report?.totalWastageCost ?? 0).toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Wasted Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report?.topWasted?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Record Wastage</CardTitle>
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
                    <Label>Quantity</Label>
                    <Input type="number" min="1" {...register("quantity", { valueAsNumber: true })} />
                    {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select value={watch("reason")} onValueChange={(val) => setValue("reason", val as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="spilled">Spilled</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.reason && <p className="text-xs text-destructive">{errors.reason.message as string}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...register("notes")} placeholder="Additional details..." rows={2} />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Wastage
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Wastage</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : wastageList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No wastage records yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wastageList.slice(0, 10).map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm font-medium">{w.productName}</TableCell>
                        <TableCell className="text-sm">{w.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={reasonColors[w.reason] || "outline"} className="text-xs capitalize">
                            {w.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(w.createdAt), "PP")}
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
