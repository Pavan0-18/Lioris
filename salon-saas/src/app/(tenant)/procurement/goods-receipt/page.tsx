"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BoneyardTable } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { format } from "date-fns";
import { PackageCheck, Loader2, Search } from "lucide-react";

export default function GoodsReceiptPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [receiving, setReceiving] = React.useState<string | null>(null);
  const [receivedQty, setReceivedQty] = React.useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["goods-receipt", search],
    queryFn: () => fetch(`/api/tenant/goods-receipt`).then((r) => r.json()),
  });

  const { data: purchaseItemsData } = useQuery({
    queryKey: ["goods-receipt-items", receiving],
    queryFn: () => fetch(`/api/tenant/purchases/${receiving}`).then((r) => r.json()),
    enabled: !!receiving,
  });

  const orders = data?.data?.data || data?.data || [];
  const purchaseItems = purchaseItemsData?.data?.items || [];
  const currentOrder = purchaseItemsData?.data;

  React.useEffect(() => {
    if (purchaseItems.length > 0) {
      const initial: Record<string, number> = {};
      purchaseItems.forEach((item: any) => { initial[item.productId || item.id] = item.quantity; });
      setReceivedQty((prev) => Object.keys(prev).length ? prev : initial);
    }
  }, [purchaseItems]);

  const receiveMutation = useMutation({
    mutationFn: async ({ purchaseOrderId }: { purchaseOrderId: string }) => {
      const items = purchaseItems.map((item: any) => ({
        productId: item.productId,
        quantityReceived: receivedQty[item.productId || item.id] ?? item.quantity,
        unitCost: item.unitCost,
      }));
      const res = await fetch("/api/tenant/goods-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseOrderId, items }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Goods receipt recorded and stock updated");
      setReceiving(null);
      setReceivedQty({});
      queryClient.invalidateQueries({ queryKey: ["goods-receipt"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    },
    onError: () => toast.error("Failed to receive goods"),
  });

  const setQty = (key: string, val: number) => {
    setReceivedQty((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  };

  const filteredOrders = search
    ? orders.filter((o: any) => (o.vendorName || "").toLowerCase().includes(search.toLowerCase()))
    : orders;

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Goods Receipt</h2>
          <p className="text-sm text-muted-foreground">Receive goods from purchase orders with partial or complete receipt tracking.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Purchase Orders Awaiting Receipt</CardTitle>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <BoneyardTable rows={4} cols={5} />
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No purchase orders found.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order: any) => (
                  <Card key={order.id} className="border border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{order.vendorName || "Unknown Vendor"}</p>
                          <p className="text-xs text-muted-foreground">
                            Invoice: {order.invoiceNumber || "-"} | {format(new Date(order.purchaseDate), "PP")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                          {receiving === order.id ? (
                            <span className="text-xs text-muted-foreground">Enter quantities below</span>
                          ) : (
                            <Button size="sm" onClick={() => setReceiving(order.id)}>
                              <PackageCheck className="h-3.5 w-3.5 mr-1" />
                              Receive
                            </Button>
                          )}
                        </div>
                      </div>

                      {receiving === order.id && (
                        <div className="border-t pt-3 mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Adjust quantities if different from ordered:</p>
                          {purchaseItems.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Loading items...</div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Product</TableHead>
                                  <TableHead className="text-xs text-right">Ordered</TableHead>
                                  <TableHead className="text-xs text-right">Receiving</TableHead>
                                  <TableHead className="text-xs text-right">Unit Cost</TableHead>
                                  <TableHead className="text-xs text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {purchaseItems.map((item: any) => {
                                  const key = item.productId || item.id;
                                  const qty = receivedQty[key] ?? item.quantity;
                                  return (
                                    <TableRow key={key}>
                                      <TableCell className="text-xs font-medium">{item.productName || "Product"}</TableCell>
                                      <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-xs text-right">
                                        <Input
                                          type="number"
                                          min="0"
                                          max={item.quantity}
                                          value={qty}
                                          onChange={(e) => setQty(key, Number(e.target.value))}
                                          className="h-7 w-20 text-xs text-right inline-block"
                                        />
                                      </TableCell>
                                      <TableCell className="text-xs text-right">${item.unitCost.toFixed(2)}</TableCell>
                                      <TableCell className="text-xs text-right">${(qty * item.unitCost).toFixed(2)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant="outline" className="text-xs">
                              {purchaseItems.filter((item: any) => {
                                const qty = receivedQty[item.productId || item.id] ?? item.quantity;
                                return qty < item.quantity;
                              }).length > 0 ? "Partial Receipt" : "Complete Receipt"}
                            </Badge>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setReceiving(null); setReceivedQty({}); }}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => receiveMutation.mutate({ purchaseOrderId: order.id })}
                                disabled={receiveMutation.isPending}
                              >
                                {receiveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                                Confirm Receipt
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
