"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SuperadminTenantsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [form, setForm] = React.useState({ salonName: "", ownerName: "", email: "", password: "", phone: "" });

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

  const list = tenantsData?.data || [];

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
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                  No registered tenants on platform.
                </TableCell>
              </TableRow>
            ) : (
              list.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/superadmin/tenants/${t.id}`)}>
                  <TableCell className="font-semibold text-sm">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.email}</TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.planStatus?.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/superadmin/tenants/${t.id}`)}>
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
