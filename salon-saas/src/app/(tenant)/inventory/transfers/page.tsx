"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft, ArrowRight, Package } from "lucide-react";

export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [fromBranchId, setFromBranchId] = React.useState("");
  const [toBranchId, setToBranchId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [notes, setNotes] = React.useState("");

  const { data: branchesData } = useQuery({
    queryKey: ["branches-for-transfers"],
    queryFn: () => fetch("/api/tenant/branches").then((r) => r.json()),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-for-transfers"],
    queryFn: () => fetch("/api/tenant/inventory/products").then((r) => r.json()),
  });

  const { data: transfersData, isLoading: isLoadingTransfers } = useQuery({
    queryKey: ["stock-transfers-list"],
    queryFn: () => fetch("/api/tenant/inventory/transfers").then((r) => r.json()),
  });

  const branches = branchesData?.data || [];
  const products = productsData?.data || [];
  const transfers = transfersData?.data || [];

  const createTransferMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          notes,
          items: [{ productId, quantity }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create transfer");
      return json;
    },
    onSuccess: () => {
      toast.success("Stock transfer recorded successfully!");
      setProductId("");
      setQuantity(1);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["stock-transfers-list"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to transfer stock.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBranchId || !toBranchId || !productId || quantity <= 0) {
      toast.error("Please fill in all required transfer fields.");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error("Source and destination branches must be different.");
      return;
    }
    createTransferMutation.mutate();
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inter-Branch Stock Transfers</h2>
          <p className="text-sm text-muted-foreground">Transfer inventory products between salon branches with real-time stock adjustment tracking.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Transfer Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="w-4 h-4 text-primary" /> New Stock Transfer
              </CardTitle>
              <CardDescription>Move stock from one branch location to another.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Source Branch (From)</Label>
                  <Select value={fromBranchId} onValueChange={setFromBranchId}>
                    <SelectTrigger><SelectValue placeholder="Select source branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destination Branch (To)</Label>
                  <Select value={toBranchId} onValueChange={setToBranchId}>
                    <SelectTrigger><SelectValue placeholder="Select target branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Product to Transfer</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transfer Quantity</Label>
                  <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                </div>

                <div className="space-y-2">
                  <Label>Notes / Reason</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Replenishing branch stock for weekend demand" />
                </div>

                <Button type="submit" className="w-full" disabled={createTransferMutation.isPending}>
                  {createTransferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Execute Stock Transfer
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfers History List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-primary" /> Transfer History
              </CardTitle>
              <CardDescription>Recent inter-branch product movement log.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading transfers...</div>
              ) : transfers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No stock transfers recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From / To Branch</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <span>{t.fromBranchName}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span>{t.toBranchName}</span>
                          </div>
                          {t.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{t.notes}</p>}
                        </TableCell>
                        <TableCell>
                          {t.items?.map((item: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold">{item.productName}</span> &times; {item.quantity}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                            {t.status}
                          </Badge>
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
