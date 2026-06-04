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
import { Plus, Package, Search } from "lucide-react";
import { toast } from "sonner";

interface PackageItem {
  id: string; name: string; description: string | null; price: number;
  totalVisits: number; validityDays: number | null; isActive: boolean;
  createdAt: string;
}

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: () => fetch("/api/tenant/marketing/packages").then(r => r.json()),
  });

  const packagesData: PackageItem[] = data?.data || [];
  const filtered = search
    ? packagesData.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      )
    : packagesData;

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/tenant/marketing/packages", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["packages"] }); setIsOpen(false); toast.success("Package created"); },
    onError: () => toast.error("Failed to create package"),
  });

  if (isLoading) return <BoneyardPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packages & Memberships</h2>
          <p className="text-sm text-muted-foreground">Create service packages and membership plans.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Package</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              createMutation.mutate({
                name: fd.get("name"),
                description: fd.get("description"),
                price: parseFloat(fd.get("price") as string),
                totalVisits: parseInt(fd.get("totalVisits") as string),
                validityDays: fd.get("validityDays") ? parseInt(fd.get("validityDays") as string) : null,
              });
            }} className="space-y-4">
              <div><Label>Name</Label><Input name="name" required /></div>
              <div><Label>Description</Label><Input name="description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price ($)</Label><Input name="price" type="number" step="0.01" required /></div>
                <div><Label>Total Visits</Label><Input name="totalVisits" type="number" required /></div>
              </div>
              <div><Label>Validity (days, optional)</Label><Input name="validityDays" type="number" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Visits</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No packages found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{p.description || "—"}</TableCell>
                <TableCell className="font-mono font-medium">${p.price.toFixed(2)}</TableCell>
                <TableCell>{p.totalVisits}</TableCell>
                <TableCell className="text-sm">{p.validityDays ? `${p.validityDays} days` : "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
