"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SuperadminTenantDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isUserOpen, setIsUserOpen] = React.useState(false);
  const [isPlanOpen, setIsPlanOpen] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState("");
  const [userForm, setUserForm] = React.useState({ name: "", email: "", password: "", role: "RECEPTIONIST", phone: "" });

  const { data: tenantData, refetch } = useQuery({
    queryKey: ["superadmin-tenant-detail", id],
    queryFn: () => fetch(`/api/superadmin/tenants/${id}`).then(res => res.json())
  });

  const { data: usersData } = useQuery({
    queryKey: ["superadmin-tenant-users", id],
    queryFn: () => fetch(`/api/superadmin/tenants/${id}/users`).then(res => res.json())
  });

  const { data: plansData } = useQuery({
    queryKey: ["superadmin-plans"],
    queryFn: () => fetch("/api/superadmin/plans").then(res => res.json())
  });

  const tenant = tenantData?.data;
  const usersList = usersData?.data || [];
  const plansList = plansData?.data || [];

  const suspendMutation = useMutation({
    mutationFn: () => fetch(`/api/superadmin/tenants/${id}/suspend`, { method: "POST" }),
    onSuccess: () => { toast.success("Tenant suspended"); refetch(); },
    onError: () => toast.error("Failed to suspend"),
  });

  const activateMutation = useMutation({
    mutationFn: () => fetch(`/api/superadmin/tenants/${id}/activate`, { method: "POST" }),
    onSuccess: () => { toast.success("Tenant activated"); refetch(); },
    onError: () => toast.error("Failed to activate"),
  });

  const changePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/superadmin/tenants/${id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { toast.success("Plan changed"); setIsPlanOpen(false); refetch(); },
    onError: () => toast.error("Failed to change plan"),
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/superadmin/tenants/${id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["superadmin-tenant-users", id] });
      setIsUserOpen(false);
      setUserForm({ name: "", email: "", password: "", role: "RECEPTIONIST", phone: "" });
    },
    onError: () => toast.error("Failed to create user"),
  });

  if (!tenant) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  const handleToggleFeature = async (featureId: string, isEnabled: boolean) => {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ featureId, isEnabled }]),
      });
      if (!res.ok) throw new Error();
      toast.success("Feature updated");
      refetch();
    } catch {
      toast.error("Failed to update feature");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tenant.name}</h2>
          <p className="text-sm text-muted-foreground">{tenant.email}</p>
        </div>
        <div className="flex gap-2">
          {tenant.isActive ? (
            <Button variant="destructive" size="sm" onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}>
              Suspend
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Plan</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{tenant.planStatus?.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">Plan ID: {tenant.planId ? tenant.planId.slice(0, 8) + "..." : "None"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Trial</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : "N/A"}</p>
            <p className="text-xs text-muted-foreground">End date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Region</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{tenant.country} / {tenant.currency}</p>
            <p className="text-xs text-muted-foreground">{tenant.timezone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tax</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{tenant.taxLabel} {tenant.taxRate}%</p>
            <p className="text-xs text-muted-foreground">{tenant.taxId || "No tax ID"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Onboarding</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{tenant.onboardingDone ? "Completed" : "Pending"}</p>
            <p className="text-xs text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Phone</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{tenant.phone || "N/A"}</p>
            <p className="text-xs text-muted-foreground">{tenant.locale}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="features">
        <TabsList>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="users">Users ({usersList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="py-4 space-y-4">
          <div className="flex gap-2">
            <Dialog open={isPlanOpen} onOpenChange={setIsPlanOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Change Plan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Change Plan for {tenant.name}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Plan</Label>
                    <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                      <option value="">Choose...</option>
                      {plansList.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} (${p.basePrice}/{p.billingCycle})</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => changePlanMutation.mutate()} disabled={!selectedPlanId || changePlanMutation.isPending} className="w-full">
                    {changePlanMutation.isPending ? "Changing..." : "Apply Plan"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle>Feature Flags</CardTitle><CardDescription>Toggle features for this tenant</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {tenant.featuresList?.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                  <div>
                    <span className="font-semibold text-xs">{f.name}</span>
                    <span className="text-[10px] block text-muted-foreground font-mono">{f.key}</span>
                  </div>
                  <Switch checked={f.isEnabled} onCheckedChange={(val) => handleToggleFeature(f.id, val)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="py-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users</CardTitle>
              <Dialog open={isUserOpen} onOpenChange={setIsUserOpen}>
                <DialogTrigger asChild><Button size="sm">Add User</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(); }} className="space-y-4">
                    <div className="space-y-2"><Label>Name</Label><Input required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Password</Label><Input required type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                        <option value="OWNER">Owner</option>
                        <option value="ADMIN">Admin</option>
                        <option value="STYLIST">Stylist</option>
                        <option value="RECEPTIONIST">Receptionist</option>
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Phone</Label><Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></div>
                    <Button type="submit" disabled={createUserMutation.isPending} className="w-full">{createUserMutation.isPending ? "Creating..." : "Create"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">No users.</TableCell></TableRow>
                  ) : (
                    usersList.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-semibold text-sm">{u.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                        <TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
