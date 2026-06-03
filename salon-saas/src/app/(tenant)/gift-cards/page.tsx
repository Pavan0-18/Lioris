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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Gift, Search, Power } from "lucide-react";
import { toast } from "sonner";

interface GiftCard {
  id: string; code: string; initialBalance: number; balance: number;
  senderName: string | null; recipientName: string | null;
  recipientEmail: string | null; isActive: boolean; createdAt: string;
}

export default function GiftCardsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gift-cards"],
    queryFn: () => fetch("/api/tenant/marketing/gift-cards").then(r => r.json()),
  });

  const cards: GiftCard[] = data?.data || [];
  const filtered = search
    ? cards.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
        c.recipientEmail?.toLowerCase().includes(search.toLowerCase())
      )
    : cards;

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/marketing/gift-cards", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gift-cards"] }); setIsOpen(false); toast.success("Gift card sold"); },
    onError: () => toast.error("Failed to sell gift card"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/tenant/marketing/gift-cards/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gift-cards"] }); toast.success("Gift card updated"); setConfirmId(null); },
    onError: () => toast.error("Failed to update gift card"),
  });

  if (isLoading) return <BoneyardPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gift Cards</h2>
          <p className="text-sm text-muted-foreground">Sell and manage gift cards.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Sell Gift Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Sell Gift Card</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              createMutation.mutate({
                initialBalance: parseFloat(fd.get("amount") as string),
                senderName: fd.get("senderName"),
                recipientName: fd.get("recipientName"),
                recipientEmail: fd.get("recipientEmail"),
                message: fd.get("message"),
              });
            }} className="space-y-4">
              <div><Label>Amount ($)</Label><Input name="amount" type="number" step="0.01" required /></div>
              <div><Label>Sender Name</Label><Input name="senderName" /></div>
              <div><Label>Recipient Name</Label><Input name="recipientName" /></div>
              <div><Label>Recipient Email</Label><Input name="recipientEmail" type="email" /></div>
              <div><Label>Message</Label><Input name="message" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Sell</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code, name, or email..."
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
              <TableHead>Balance</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No gift cards found.
                </TableCell>
              </TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell>${c.balance.toFixed(2)} / ${c.initialBalance.toFixed(2)}</TableCell>
                <TableCell>{c.recipientName || c.recipientEmail || "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-sm">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmId(c.id)} title={c.isActive ? "Deactivate" : "Activate"}>
                    <Power className={`h-4 w-4 ${c.isActive ? "text-destructive" : "text-muted-foreground"}`} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Toggle Gift Card</DialogTitle><DialogDescription>Are you sure you want to toggle this gift card?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const c = cards.find(c => c.id === confirmId);
              toggleMutation.mutate({ id: confirmId!, isActive: !c?.isActive });
            }}>{cards.find(c => c.id === confirmId)?.isActive ? "Deactivate" : "Activate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
