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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";

interface Handover {
  id: string; branchId: string; fromStaffId: string; toStaffId: string | null;
  notes: string; priority: string; isCompleted: boolean; shiftDate: string; createdAt: string;
}

export default function ShiftHandoversPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [priority, setPriority] = React.useState("normal");

  const { data, isLoading } = useQuery({
    queryKey: ["shift-handovers"],
    queryFn: () => fetch("/api/tenant/shift-handovers").then(r => r.json()),
  });

  const handovers: Handover[] = data?.data || [];
  const filtered = search
    ? handovers.filter(h =>
        h.notes.toLowerCase().includes(search.toLowerCase()) ||
        h.priority.toLowerCase().includes(search.toLowerCase()) ||
        h.fromStaffId.toLowerCase().includes(search.toLowerCase()) ||
        (h.toStaffId && h.toStaffId.toLowerCase().includes(search.toLowerCase()))
      )
    : handovers;

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/shift-handovers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-handovers"] }); setIsOpen(false); toast.success("Handover note created"); },
    onError: () => toast.error("Failed to create handover note"),
  });

  if (isLoading) return <BoneyardPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shift Handovers</h2>
          <p className="text-sm text-muted-foreground">Log and track shift handover notes.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Handover Note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Handover Note</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              createMutation.mutate({
                branchId: fd.get("branchId"),
                fromStaffId: fd.get("fromStaffId"),
                toStaffId: fd.get("toStaffId") || null,
                notes: fd.get("notes"),
                priority,
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Branch ID</Label><Input name="branchId" required /></div>
                <div><Label>From Staff ID</Label><Input name="fromStaffId" required /></div>
              </div>
              <div><Label>To Staff ID (optional)</Label><Input name="toStaffId" /></div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority} defaultValue="normal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><textarea name="notes" rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by notes, staff, or priority..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No handover notes found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : filtered.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="text-sm">{new Date(h.shiftDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs">
                  <div>From: {h.fromStaffId}</div>
                  {h.toStaffId && <div>To: {h.toStaffId}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    h.priority === "urgent" ? "destructive" :
                    h.priority === "high" ? "default" : "secondary"
                  }>{h.priority}</Badge>
                </TableCell>
                <TableCell className="max-w-md truncate">{h.notes}</TableCell>
                <TableCell>
                  <Badge variant={h.isCompleted ? "default" : "secondary"}>{h.isCompleted ? "Completed" : "Pending"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
