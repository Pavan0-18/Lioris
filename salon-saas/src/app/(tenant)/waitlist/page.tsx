"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, List, Search, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

interface WaitlistEntry {
  id: string; customerName: string; customerPhone: string;
  branchId: string; serviceIds: string[];
  preferredDate: string | null; notes: string | null;
  status: string; createdAt: string;
}

export default function WaitlistPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ["waitlist"],
    queryFn: () => fetch("/api/tenant/waitlist").then(r => r.json()),
  });

  const entries: WaitlistEntry[] = waitlistData?.data || [];
  const filtered = search
    ? entries.filter(e =>
        e.customerName.toLowerCase().includes(search.toLowerCase()) ||
        e.customerPhone.includes(search) ||
        e.status.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["waitlist"] }); setIsOpen(false); toast.success("Added to waitlist"); },
    onError: () => toast.error("Failed to add to waitlist"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tenant/waitlist/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["waitlist"] }); toast.success("Waitlist updated"); },
    onError: () => toast.error("Failed to update waitlist"),
  });

  if (isLoading) return <BoneyardPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Waitlist</h2>
          <p className="text-sm text-muted-foreground">
            Manage walk-in and waitlist entries. Auto-books when slots open.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add to Waitlist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to Waitlist</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              createMutation.mutate({
                customerName: fd.get("customerName"),
                customerPhone: fd.get("customerPhone"),
                branchId: fd.get("branchId"),
                serviceIds: fd.get("serviceIds") ? (fd.get("serviceIds") as string).split(",").map(s => s.trim()) : [],
                notes: fd.get("notes"),
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Customer Name</Label><Input name="customerName" required /></div>
                <div><Label>Phone</Label><Input name="customerPhone" required /></div>
              </div>
              <div><Label>Branch ID</Label><Input name="branchId" required /></div>
              <div><Label>Service IDs (comma-separated)</Label><Input name="serviceIds" placeholder="SVC001, SVC002" /></div>
              <div><Label>Notes</Label><Input name="notes" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Preferred</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No waitlist entries found.
                </TableCell>
              </TableRow>
            ) : filtered.map((e, i) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono">{i + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{e.customerName}</div>
                  <div className="text-xs text-muted-foreground">{e.customerPhone}</div>
                </TableCell>
                <TableCell>{e.serviceIds?.join(", ") || "—"}</TableCell>
                <TableCell className="text-sm">
                  {e.preferredDate ? new Date(e.preferredDate).toLocaleDateString() : "ASAP"}
                </TableCell>
                <TableCell>
                  <Badge variant={e.status === "waiting" ? "default" : "secondary"}>
                    {e.status === "waiting" ? "Waiting" : e.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {e.status === "waiting" && (
                      <Button variant="ghost" size="icon" onClick={() => updateMutation.mutate({ id: e.id, status: "checked_in" })} title="Check in">
                        <UserCheck className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => updateMutation.mutate({ id: e.id, status: "cancelled" })} title="Remove">
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
