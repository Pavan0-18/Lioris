"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy, Power, Search, Tag } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string; code: string; type: string; value: number; minPurchase: number;
  maxDiscount: number | null; usageLimit: number; usedCount: number;
  appliesTo: string | null; startsAt: string | null; expiresAt: string | null;
  isActive: boolean; createdAt: string;
}

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => fetch("/api/tenant/marketing/coupons").then(r => r.json()),
  });

  const coupons: Coupon[] = data?.data || [];
  const filtered = search ? coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase())) : coupons;

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/marketing/coupons", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coupons"] }); setIsOpen(false); toast.success("Coupon created"); },
    onError: () => toast.error("Failed to create coupon"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/tenant/marketing/coupons/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Coupon updated"); setConfirmId(null); },
    onError: () => toast.error("Failed to update coupon"),
  });

  if (isLoading) return <BoneyardPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Promotions</h2>
          <p className="text-sm text-muted-foreground">Manage coupons and discount codes.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
            <CouponForm
              onSubmit={(data: any) => createMutation.mutate(data)}
              onCancel={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No coupons found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell>
                  {c.type === "percentage" ? `${c.value}%` : `$${c.value}`}
                  {c.maxDiscount ? ` (max $${c.maxDiscount})` : ""}
                </TableCell>
                <TableCell>{c.usedCount}/{c.usageLimit || "∞"}</TableCell>
                <TableCell className="text-xs">
                  {c.startsAt ? `From ${new Date(c.startsAt).toLocaleDateString()}` : "Always"}
                  {c.expiresAt ? ` to ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmId(c.id)} title={c.isActive ? "Deactivate" : "Activate"}>
                      <Power className={`h-4 w-4 ${c.isActive ? "text-destructive" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Toggle Coupon</DialogTitle><DialogDescription>Are you sure you want to toggle this coupon?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const c = coupons.find(c => c.id === confirmId);
              toggleMutation.mutate({ id: confirmId!, isActive: !c?.isActive });
            }}>{coupons.find(c => c.id === confirmId)?.isActive ? "Deactivate" : "Activate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponForm({ onSubmit, onCancel }: any) {
  const [form, setForm] = React.useState({
    code: "", type: "percentage", value: 0, minPurchase: 0,
    maxDiscount: "", usageLimit: 0, expiresAt: "",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER20" required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Value</Label><Input type="number" step="0.01" value={String(form.value)} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) })} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Min Purchase ($)</Label><Input type="number" step="0.01" value={String(form.minPurchase)} onChange={(e) => setForm({ ...form, minPurchase: parseFloat(e.target.value) })} /></div>
        <div><Label>Max Discount ($)</Label><Input type="number" step="0.01" value={form.maxDiscount} onChange={(e) => { const v = e.target.value; setForm({ ...form, maxDiscount: v })}} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Usage Limit</Label><Input type="number" value={String(form.usageLimit)} onChange={(e) => setForm({ ...form, usageLimit: parseInt(e.target.value) || 0 })} /></div>
        <div><Label>Expires At</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create</Button>
      </div>
    </form>
  );
}
