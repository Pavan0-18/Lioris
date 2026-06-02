"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { BoneyardPage, BoneyardTable } from "@/components/ui/boneyard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatInTimezone } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";

const statuses = ["all", "draft", "partial", "paid", "void"] as const;

export default function BillingInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const limit = 20;

  const queryKey = ["invoices", activeStatus, search, page];
  const { data: invoicesData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeStatus !== "all") params.set("status", activeStatus);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/tenant/billing/invoices?${params}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ["billing-summary", "today"],
    queryFn: () => fetch("/api/tenant/billing/summary?period=today").then(res => res.json()),
    staleTime: 2 * 60 * 1000,
  });

  const summary = summaryData?.data;
  const list = invoicesData?.data?.invoices || [];
  const totalCount = invoicesData?.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <FeatureGate feature="BILLING">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Billing</h2>
            <p className="text-sm text-muted-foreground">Manage invoices and payments</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Today&apos;s Revenue</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(summary?.revenue?.total || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Today&apos;s Invoices</p>
              <p className="text-xl font-bold mt-1">{summary?.invoices?.count || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Balance</p>
              <p className="text-xl font-bold mt-1">
                {formatCurrency(
                  (list as any[]).filter(i => i.status === "partial" || i.status === "draft")
                    .reduce((s, i: any) => s + i.total, 0)
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg Invoice Value</p>
              <p className="text-xl font-bold mt-1">{summary?.invoices?.averageValue ? formatCurrency(summary.invoices.averageValue) : formatCurrency(0)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => { setActiveStatus(s); setPage(1); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      activeStatus === s
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-sm ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice no or customer..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <BoneyardTable rows={5} cols={5} />
            ) : list.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <button
                            onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                            className="font-semibold text-sm underline-offset-2 hover:underline text-primary"
                          >
                            {inv.invoiceNo}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">{inv.customer?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatInTimezone(inv.createdAt, "UTC", "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(inv.total)}</TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} ({totalCount} invoices)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <CreateInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    </FeatureGate>
  );
}

function CreateInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [items, setItems] = useState<{ name: string; price: string; qty: string; discount: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");

  const { data: customersData } = useQuery({
    queryKey: ["customers", "search"],
    queryFn: () => fetch("/api/tenant/customers").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/tenant/branches").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const customers = Array.isArray(customersData?.data) ? customersData.data : [];
  const branches = Array.isArray(branchesData?.data) ? branchesData.data : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          branchId,
          items: items.map(i => ({
            name: i.name,
            price: parseFloat(i.price),
            qty: parseInt(i.qty) || 1,
            discount: parseFloat(i.discount) || 0,
          })),
          notes: notes || undefined,
          discount: parseFloat(discount) || 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invoice created!");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
      onClose();
      setStep(1);
      setCustomerId("");
      setBranchId("");
      setItems([]);
      setNotes("");
      setDiscount("0");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const customersList = Array.isArray(customers) ? customers : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Step {step} of 2 — {step === 1 ? "Select customer and branch" : "Add items"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersList.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!customerId || !branchId}>
                Next — Add Items
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Item Name</Label>
                    <Input
                      value={item.name}
                      onChange={e => {
                        const next = [...items];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setItems(next);
                      }}
                      placeholder="Service or product name"
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={e => {
                        const next = [...items];
                        next[idx] = { ...next[idx], price: e.target.value };
                        setItems(next);
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={e => {
                        const next = [...items];
                        next[idx] = { ...next[idx], qty: e.target.value };
                        setItems(next);
                      }}
                      placeholder="1"
                    />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs">Disc %</Label>
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={e => {
                        const next = [...items];
                        next[idx] = { ...next[idx], discount: e.target.value };
                        setItems(next);
                      }}
                      placeholder="0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mb-0.5"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems([...items, { name: "", price: "", qty: "1", discount: "0" }])}
              >
                + Add Item
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Invoice Discount (flat)</Label>
              <Input
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Payment notes..."
              />
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || items.length === 0 || items.some(i => !i.name || !i.price)}
              >
                {createMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
