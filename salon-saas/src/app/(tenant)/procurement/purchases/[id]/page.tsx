"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PurchaseDetailPage() {
  const params = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["procurement-purchase", params.id],
    queryFn: () => fetch(`/api/tenant/purchases/${params.id}`).then((r) => r.json()),
    enabled: !!params.id,
  });

  const order = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Purchase order not found.
      </div>
    );
  }

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/procurement/purchases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Purchase Order {order.invoiceNumber || order.id.slice(0, 8)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {order.purchaseDate && format(new Date(order.purchaseDate), "PP")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {order.vendorName || "N/A"}</p>
              <p><span className="text-muted-foreground">Contact:</span> {order.vendorContact || "N/A"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {order.vendorPhone || "N/A"}</p>
              <p><span className="text-muted-foreground">Email:</span> {order.vendorEmail || "N/A"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Invoice:</span> {order.invoiceNumber || "N/A"}</p>
              <p><span className="text-muted-foreground">Date:</span> {order.purchaseDate ? format(new Date(order.purchaseDate), "PP") : "N/A"}</p>
              <p><span className="text-muted-foreground">Total Amount:</span> <span className="font-bold">${order.totalAmount.toFixed(2)}</span></p>
              {order.notes && <p><span className="text-muted-foreground">Notes:</span> {order.notes}</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent>
            {order.items?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{item.productSku}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unitName || "units"}</TableCell>
                      <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${item.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No items in this order.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
