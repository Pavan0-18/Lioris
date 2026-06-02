"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { WorkingHoursEditor, WorkingHourRow } from "@/components/settings/working-hours-editor";

interface BranchForm {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
}

const emptyForm: BranchForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  country: "IN",
  phone: "",
  email: "",
};

const DEFAULT_WEEK: WorkingHourRow[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: "09:00",
  closeTime: "18:00",
  isClosed: i === 0,
}));

export default function SettingsBranchesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<BranchForm>(emptyForm);

  // Working hours state
  const [hoursBranchId, setHoursBranchId] = React.useState<string | null>(null);
  const [hoursDialogOpen, setHoursDialogOpen] = React.useState(false);
  const [hoursRows, setHoursRows] = React.useState<WorkingHourRow[]>(DEFAULT_WEEK);
  const [hoursSaving, setHoursSaving] = React.useState(false);

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/tenant/branches").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: hoursData } = useQuery({
    queryKey: ["branch-hours", hoursBranchId],
    queryFn: () => fetch(`/api/tenant/branches/${hoursBranchId}/hours`).then(res => res.json()),
    enabled: !!hoursBranchId,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (hoursData?.data && hoursDialogOpen) {
      setHoursRows(hoursData.data);
    } else if (hoursDialogOpen && !hoursData?.data) {
      setHoursRows(DEFAULT_WEEK);
    }
  }, [hoursData, hoursDialogOpen]);

  const list = branchesData?.data || [];

  const openCreateDialog = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (branch: any) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      country: branch.country || "IN",
      phone: branch.phone || "",
      email: branch.email || "",
    });
    setDialogOpen(true);
  };

  const openHoursDialog = (branchId: string) => {
    setHoursBranchId(branchId);
    setHoursDialogOpen(true);
  };

  const saveHours = async () => {
    if (!hoursBranchId) return;
    setHoursSaving(true);
    try {
      const res = await fetch(`/api/tenant/branches/${hoursBranchId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hoursRows),
      });
      if (!res.ok) throw new Error();
      toast.success("Working hours saved");
      setHoursDialogOpen(false);
    } catch {
      toast.error("Failed to save working hours");
    } finally {
      setHoursSaving(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingBranch
        ? `/api/tenant/branches/${editingBranch.id}`
        : "/api/tenant/branches";
      const method = editingBranch ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingBranch ? "Branch updated" : "Branch created");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: () => toast.error("Failed to save branch"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/branches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success("Branch deleted");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: () => toast.error("Failed to delete branch"),
  });

  if (isLoading) {
    return <BoneyardPage />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-2xl font-bold tracking-tight">Active Branches</h2>
          <p className="text-sm text-muted-foreground">Configure multi-branch locations, working hours, and regional staff pools.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" /> Add Branch
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No branches yet. Add your first branch to get started.</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>Add Branch</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
          {list.map((b: any) => (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {b.name}
                    {b.isHQ && <Badge className="text-[10px]">HQ</Badge>}
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHoursDialog(b.id)} title="Working Hours">
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(b)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                    if (confirm(`Delete branch "${b.name}"?`)) deleteMutation.mutate(b.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {b.address && <p>{b.address}</p>}
                <p>{[b.city, b.state, b.country].filter(Boolean).join(", ")}</p>
                {b.phone && <p className="pt-1">{b.phone}</p>}
                {b.email && <p>{b.email}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Branch create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>
              {editingBranch ? "Update branch location details." : "Create a new branch location for your salon."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="branchName">Branch Name *</Label>
              <Input id="branchName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Downtown Salon" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="branchAddress">Address</Label>
              <Input id="branchAddress" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchCity">City</Label>
              <Input id="branchCity" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchState">State</Label>
              <Input id="branchState" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchPhone">Phone</Label>
              <Input id="branchPhone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchEmail">Email</Label>
              <Input id="branchEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="branch@salon.com" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Working hours dialog */}
      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Working Hours</DialogTitle>
            <DialogDescription>
              Set weekly open and close times. Mark days as closed when the branch is not operational.
            </DialogDescription>
          </DialogHeader>
          <WorkingHoursEditor value={hoursRows} onChange={setHoursRows} />
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setHoursDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveHours} disabled={hoursSaving}>
              {hoursSaving ? "Saving..." : "Save Hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
