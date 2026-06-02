"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ServiceModal } from "@/components/settings/service-modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BoneyardTable, BoneyardPage } from "@/components/ui/boneyard";
import { Plus, Pencil, Trash2, Layers, GripVertical, X } from "lucide-react";

export default function SettingsServicesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editService, setEditService] = React.useState<any | null>(null);
  const [catDialogOpen, setCatDialogOpen] = React.useState(false);
  const [catName, setCatName] = React.useState("");
  const [editingCat, setEditingCat] = React.useState<any | null>(null);
  const [deleteCatId, setDeleteCatId] = React.useState<string | null>(null);

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetch("/api/tenant/services").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/tenant/service-categories").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const servicesList = servicesData?.data || [];
  const categoriesList = categoriesData?.data || [];

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Category created");
      setCatDialogOpen(false);
      setCatName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Failed to create category"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/service-categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Category updated");
      setCatDialogOpen(false);
      setEditingCat(null);
      setCatName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Failed to update category"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/service-categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Category deleted");
      setDeleteCatId(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteCatId(null);
    },
  });

  const handleSaveService = async (payload: any) => {
    try {
      const url = editService ? `/api/tenant/services/${editService.id}` : "/api/tenant/services";
      const method = editService ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editService ? "Service updated" : "Service created");
      setEditService(null);
      queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch {
      toast.error("Failed to save service.");
    }
  };

  const openEditService = (svc: any) => {
    setEditService(svc);
    setIsModalOpen(true);
  };

  const openCreateService = () => {
    setEditService(null);
    setIsModalOpen(true);
  };

  const openCreateCategory = () => {
    setEditingCat(null);
    setCatName("");
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat: any) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDialogOpen(true);
  };

  if (servicesLoading || categoriesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Services Catalog</h2>
            <p className="text-sm text-muted-foreground">Manage service pricing list, categories, and stylist limits.</p>
          </div>
        </div>
        <BoneyardTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-playfair text-2xl font-bold tracking-tight">Services Catalog</h2>
          <p className="text-sm text-muted-foreground">Manage service pricing list, categories, and stylist limits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateCategory}>
            <Layers className="h-4 w-4 mr-2" /> Add Category
          </Button>
          <Button onClick={openCreateService}>
            <Plus className="h-4 w-4 mr-2" /> Add New Service
          </Button>
        </div>
      </div>

      {/* Categories section */}
      {categoriesList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Service Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((cat: any) => (
                <div
                  key={cat.id}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/30 text-sm"
                >
                  <span>{cat.name}</span>
                  <button
                    onClick={() => openEditCategory(cat)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setDeleteCatId(cat.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No services configured yet. Add your first service above.
                  </TableCell>
                </TableRow>
              ) : (
                servicesList.map((s: any) => {
                  const cat = categoriesList.find((c: any) => c.id === s.categoryId);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{cat?.name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.duration} mins</TableCell>
                      <TableCell className="text-xs font-semibold">${Number(s.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs">
                        <Badge variant={s.taxable ? "default" : "secondary"} className="text-[10px]">
                          {s.taxable ? "Taxable" : "Non-taxable"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditService(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Service create/edit modal */}
      <ServiceModal
        open={isModalOpen}
        onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditService(null); }}
        service={editService}
        categories={categoriesList}
        onSave={handleSaveService}
      />

      {/* Category create/edit dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCat ? "Rename this service category." : "Create a new category for grouping services."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="catName">Category Name</Label>
            <Input
              id="catName"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Hair Services"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCatDialogOpen(false); setEditingCat(null); setCatName(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => editingCat ? updateCategoryMutation.mutate() : createCategoryMutation.mutate()}
              disabled={!catName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {editingCat ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirmation */}
      <Dialog open={!!deleteCatId} onOpenChange={(open) => { if (!open) setDeleteCatId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              This will permanently remove this category. Services in this category will not be deleted but will become uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCatId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteCatId && deleteCategoryMutation.mutate(deleteCatId)}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
