"use client";
import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BoneyardPage } from "@/components/ui/boneyard";
import { FeatureGate } from "@/components/feature-gate";
import { formatCurrency } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetch(`/api/tenant/billing/invoices/${id}`).then(res => res.json()),
  });

  const inv = data?.data;
  const isEditable = inv?.status === "draft" || inv?.status === "partial";
  const isReadonly = inv?.status === "paid" || inv?.status === "void";

  const voidMutation = useMutation({
    mutationFn: () => fetch(`/api/tenant/billing/invoices/${id}/void`, { method: "PATCH" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Invoice voided");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => toast.error("Failed to void invoice"),
  });

  const handlePrint = useCallback(() => {
    const blobUrl = URL.createObjectURL(new Blob([`<html><head><title>Loading...</title></head><body></body></html>`], { type: "text/html" }));
    const w = window.open(blobUrl);
    if (w) {
      fetch(`/api/tenant/billing/invoices/${id}/print`)
        .then(r => r.text())
        .then(html => {
          w.document.write(html);
          w.document.close();
          w.print();
        });
    }
  }, [id]);

  if (isLoading) return <BoneyardPage />;
  if (!inv) return <div className="p-8 text-center text-muted-foreground">Invoice not found</div>;

  const totalPaid = (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  const remaining = Math.max(0, inv.total - totalPaid);
  const progressPct = inv.total > 0 ? Math.min(100, (totalPaid / inv.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/billing")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Invoice {inv.invoiceNo}</h2>
            <InvoiceStatusBadge status={inv.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          {isEditable && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (confirm("Void this invoice?")) voidMutation.mutate(); }}
            >
              Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{inv.customerName || inv.customer?.name || "—"}</p>
              <p className="text-sm text-muted-foreground">{inv.customerPhone || inv.customer?.phone || ""}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Tax</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(inv.items || []).map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3 text-center">{item.qty}</td>
                      <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-3 text-right">{item.taxRate}%</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Separator className="my-3" />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(inv.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(inv.taxAmount)}</span>
                </div>
                {inv.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{formatCurrency(inv.discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(inv.total)}</span>
                </div>
              </div>

              {isEditable && (
                <div className="mt-6 space-y-4 border-t pt-4">
                  <DiscountSection inv={inv} id={id} />
                  <FeatureGate feature="LOYALTY">
                    <LoyaltySection inv={inv} id={id} />
                  </FeatureGate>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {isEditable ? (
            <>
              <Card>
                <CardContent className="p-6 space-y-3">
                  <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                  <p className="text-3xl font-bold">{formatCurrency(remaining)}</p>
                  <div className="flex justify-between text-sm">
                    <span>Paid: {formatCurrency(totalPaid)}</span>
                    <span>Remaining: {formatCurrency(remaining)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {inv.payments?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Payments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(inv.payments || []).map((p: any) => (
                      <div key={p.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                        <span className="text-muted-foreground capitalize">{p.method}</span>
                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {remaining > 0 && (
                <>
                  <AddPaymentSection id={id} inv={inv} />
                  <SplitPaymentSection id={id} inv={inv} />
                </>
              )}

              {remaining <= 0 && inv.status === "paid" && (
                <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
                  <CardContent className="p-6 text-center space-y-2">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Payment Complete ✓</p>
                    <p className="text-sm text-muted-foreground">Loyalty points earned for this transaction</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : isReadonly ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <InvoiceStatusBadge status={inv.status} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{inv.customerName || inv.customer?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{inv.customerPhone || inv.customer?.phone || ""}</p>
                </CardContent>
              </Card>
              {inv.payments?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Payments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(inv.payments || []).map((p: any) => (
                      <div key={p.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                        <span className="text-muted-foreground capitalize">{p.method}</span>
                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DiscountSection({ inv, id }: { inv: any; id: string }) {
  const queryClient = useQueryClient();
  const [discountType, setDiscountType] = useState<"flat" | "percentage">("flat");
  const [discountValue, setDiscountValue] = useState("");

  const discountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/billing/invoices/${id}/discount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountType, discountValue: parseFloat(discountValue) }),
      });
      if (!res.ok) throw new Error("Failed to apply discount");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Discount applied");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      setDiscountValue("");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-primary font-medium hover:underline"
      >
        {open ? "Hide Discount" : "Apply Discount"}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={discountType === "flat" ? "default" : "outline"}
              size="sm"
              onClick={() => setDiscountType("flat")}
            >
              Flat
            </Button>
            <Button
              variant={discountType === "percentage" ? "default" : "outline"}
              size="sm"
              onClick={() => setDiscountType("percentage")}
            >
              Percentage
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={discountType === "flat" ? "Amount" : "Percent"}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => discountMutation.mutate()}
              disabled={discountMutation.isPending || !discountValue}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoyaltySection({ inv, id }: { inv: any; id: string }) {
  const queryClient = useQueryClient();
  const [points, setPoints] = useState("");

  const loyaltyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/billing/invoices/${id}/loyalty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id, points: parseInt(points) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to redeem loyalty points");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Loyalty points redeemed");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      setPoints("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Loyalty Points</p>
      <p className="text-xs text-muted-foreground">
        Available: {inv.loyaltyPoints ?? inv.customer?.loyaltyPoints ?? 0}
      </p>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Redeem points"
          value={points}
          onChange={e => setPoints(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => loyaltyMutation.mutate()}
          disabled={loyaltyMutation.isPending || !points}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

function AddPaymentSection({ id, inv }: { id: string; inv: any }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/billing/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), method }),
      });
      if (!res.ok) throw new Error("Payment failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setAmount("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Add Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["cash", "card", "upi", "wallet", "other"].map(m => (
              <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <Button
          className="w-full"
          size="sm"
          onClick={() => paymentMutation.mutate()}
          disabled={paymentMutation.isPending || !amount}
        >
          Record Payment
        </Button>
      </CardContent>
    </Card>
  );
}

function SplitPaymentSection({ id, inv }: { id: string; inv: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ method: string; amount: string }[]>([
    { method: "cash", amount: "" },
  ]);

  const splitMutation = useMutation({
    mutationFn: async () => {
      const payments = rows.map(r => ({
        method: r.method,
        amount: parseFloat(r.amount) || 0,
      }));
      const total = payments.reduce((s, p) => s + p.amount, 0);
      const remaining = inv.total - (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
      if (total > remaining) throw new Error("Total split exceeds remaining balance");
      const res = await fetch(`/api/tenant/billing/invoices/${id}/split-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Split payment failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Split payment recorded");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setRows([{ method: "cash", amount: "" }]);
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const splitTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const remaining = inv.total - (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  const isValid = splitTotal > 0 && splitTotal <= remaining + 0.01;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-primary font-medium hover:underline"
      >
        {open ? "Cancel Split Payment" : "Split Payment"}
      </button>
      {open && (
        <Card className="mt-2">
          <CardContent className="p-4 space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select
                  value={row.method}
                  onValueChange={v => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], method: v };
                    setRows(next);
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["cash", "card", "upi", "wallet", "other"].map(m => (
                      <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={e => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], amount: e.target.value };
                    setRows(next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {rows.length < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRows([...rows, { method: "cash", amount: "" }])}
              >
                + Add Row
              </Button>
            )}
            <div className="flex justify-between text-sm">
              <span>Total: {formatCurrency(splitTotal)}</span>
              <span className="text-muted-foreground">Remaining: {formatCurrency(remaining)}</span>
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={() => splitMutation.mutate()}
              disabled={!isValid || splitMutation.isPending}
            >
              Record Split Payment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
