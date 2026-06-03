"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Drawer {
  id: string; branchId: string; openedBy: string; closedBy: string | null;
  openingBalance: number; closingBalance: number | null; expectedBalance: number | null;
  difference: number | null; cashSales: number | null; cardSales: number | null;
  tipsCollected: number | null; openedAt: string; closedAt: string | null;
}

export default function CashDrawerPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [closeId, setCloseId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cash-drawer"],
    queryFn: () => fetch("/api/tenant/cash-drawer").then(r => r.json()),
  });

  const drawers: Drawer[] = data?.data || [];
  const filtered = search
    ? drawers.filter(d =>
        d.branchId.toLowerCase().includes(search.toLowerCase()) ||
        d.openedBy.toLowerCase().includes(search.toLowerCase()) ||
        (d.closedBy && d.closedBy.toLowerCase().includes(search.toLowerCase())) ||
        new Date(d.openedAt).toLocaleDateString().includes(search)
      )
    : drawers;

  const openMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/cash-drawer", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cash-drawer"] }); setIsOpen(false); toast.success("Drawer opened"); },
    onError: () => toast.error("Failed to open drawer"),
  });

  const closeMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/cash-drawer", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cash-drawer"] }); setCloseId(null); toast.success("Drawer closed and reconciled"); },
    onError: () => toast.error("Failed to close drawer"),
  });

  if (isLoading) return <BoneyardPage />;

  const openDrawer = drawers.find(d => !d.closedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cash Drawer</h2>
          <p className="text-sm text-muted-foreground">Manage cash drawer open/close and reconciliation.</p>
        </div>
        {!openDrawer ? (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Open Drawer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Open Cash Drawer</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                openMutation.mutate({
                  branchId: fd.get("branchId"),
                  openedBy: fd.get("openedBy"),
                  openingBalance: parseFloat(fd.get("openingBalance") as string),
                });
              }} className="space-y-4">
                <div><Label>Branch ID</Label><Input name="branchId" required /></div>
                <div><Label>Opened By (Staff ID)</Label><Input name="openedBy" required /></div>
                <div><Label>Opening Balance ($)</Label><Input name="openingBalance" type="number" step="0.01" required /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit">Open</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={!!closeId} onOpenChange={(v) => !v && setCloseId(null)}>
            <DialogTrigger asChild>
              <Button variant="destructive" onClick={() => setCloseId(openDrawer.id)}>Close Drawer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Close Cash Drawer</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                closeMutation.mutate({
                  id: closeId,
                  closedBy: fd.get("closedBy"),
                  closingBalance: parseFloat(fd.get("closingBalance") as string),
                  expectedBalance: parseFloat(fd.get("expectedBalance") as string),
                  cashSales: parseFloat(fd.get("cashSales") as string) || 0,
                  cardSales: parseFloat(fd.get("cardSales") as string) || 0,
                  tipsCollected: parseFloat(fd.get("tipsCollected") as string) || 0,
                  notes: fd.get("notes"),
                });
              }} className="space-y-4">
                <div><Label>Closed By (Staff ID)</Label><Input name="closedBy" required /></div>
                <div><Label>Closing Balance ($)</Label><Input name="closingBalance" type="number" step="0.01" required /></div>
                <div><Label>Expected Balance ($)</Label><Input name="expectedBalance" type="number" step="0.01" required /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Cash Sales</Label><Input name="cashSales" type="number" step="0.01" /></div>
                  <div><Label>Card Sales</Label><Input name="cardSales" type="number" step="0.01" /></div>
                  <div><Label>Tips</Label><Input name="tipsCollected" type="number" step="0.01" /></div>
                </div>
                <div><Label>Notes</Label><Input name="notes" /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCloseId(null)}>Cancel</Button>
                  <Button type="submit">Close & Reconcile</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by branch, staff, or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {openDrawer && (
        <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="font-medium">Drawer Open</p>
              <p className="text-sm text-muted-foreground">
                Opened with ${openDrawer.openingBalance.toFixed(2)} at {new Date(openDrawer.openedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Opening</TableHead>
              <TableHead>Closing</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No drawer records found.
                </TableCell>
              </TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm">{new Date(d.openedAt).toLocaleDateString()}</TableCell>
                <TableCell>${d.openingBalance.toFixed(2)}</TableCell>
                <TableCell>{d.closingBalance ? `$${d.closingBalance.toFixed(2)}` : "—"}</TableCell>
                <TableCell>
                  {d.difference !== null ? (
                    <span className={`font-medium ${d.difference !== 0 ? "text-destructive" : "text-green-600"}`}>
                      ${d.difference.toFixed(2)}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={d.closedAt ? "secondary" : "default"}>
                    {d.closedAt ? "Closed" : "Open"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
