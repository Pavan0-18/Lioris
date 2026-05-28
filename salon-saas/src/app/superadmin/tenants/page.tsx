"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Edit2, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export default function SuperadminTenantsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingTenant, setEditingTenant] = React.useState<any>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [form, setForm] = React.useState({ salonName: "", ownerName: "", email: "", password: "", phone: "" });
  const [editForm, setEditForm] = React.useState({ name: "", email: "", phone: "", timezone: "", taxRate: "" });

  const { data: tenantsData } = useQuery({
    queryKey: ["superadmin-tenants"],
    queryFn: () => fetch("/api/superadmin/tenants").then(res => res.json())
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success("Tenant created successfully!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      setIsOpen(false);
      setForm({ salonName: "", ownerName: "", email: "", password: "", phone: "" });
    },
    onError: () => toast.error("Failed to create tenant"),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/superadmin/tenants/${editingTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || undefined,
          email: editForm.email || undefined,
          phone: editForm.phone || undefined,
          timezone: editForm.timezone || undefined,
          taxRate: editForm.taxRate ? parseFloat(editForm.taxRate) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success("Tenant updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      setIsEditOpen(false);
      setEditingTenant(null);
    },
    onError: () => toast.error("Failed to update tenant"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success("Tenant archived successfully!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    },
    onError: () => toast.error("Failed to archive tenant"),
  });

  const list = tenantsData?.data || [];

  // Filter tenants based on search and status
  const filteredList = list.filter((t: any) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && t.isActive) ||
      (statusFilter === "inactive" && !t.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Paginate
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || "",
      timezone: tenant.timezone || "",
      taxRate: tenant.taxRate?.toString() || "",
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administrative Tenants Control</h2>
          <p className="text-sm text-muted-foreground">Deploy, activate, or suspend multi-tenant salon workspaces.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Create Tenant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Salon Name</Label>
                <Input required value={form.salonName} onChange={(e) => setForm({ ...form, salonName: e.target.value })} placeholder="Glamour Studio" />
              </div>
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <Input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="owner@salon.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label className="text-xs mb-2 block">Search by name or email</Label>
          <Input 
            placeholder="Search tenants..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <Label className="text-xs mb-2 block">Status</Label>
          <Select value={statusFilter} onValueChange={(val) => {
            setStatusFilter(val);
            setCurrentPage(1);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salon Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial End</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                  {list.length === 0 ? "No registered tenants on platform." : "No tenants match your search."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedList.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold text-sm cursor-pointer hover:underline" onClick={() => router.push(`/superadmin/tenants/${t.id}`)}>
                    {t.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.email}</TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.planStatus?.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push(`/superadmin/tenants/${t.id}`)}
                      >
                        Manage
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(t)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          if (window.confirm(`Archive tenant "${t.name}"?`)) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          {editingTenant && (
            <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Salon Name</Label>
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  placeholder="Salon name" 
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editForm.email} 
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                  placeholder="email@salon.com" 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                  placeholder="+1 234 567 8900" 
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input 
                  value={editForm.timezone} 
                  onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })} 
                  placeholder="Asia/Kolkata" 
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editForm.taxRate} 
                  onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })} 
                  placeholder="18" 
                />
              </div>
              <Button type="submit" disabled={editMutation.isPending} className="w-full">
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
