"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema } from "@/lib/validators/inventory";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/inventory/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus } from "lucide-react";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  units: { id: string; name: string; abbreviation: string }[];
  onSave: (data: any) => Promise<void>;
  onLookupsChange?: () => void;
}

function QuickCreateDialog({
  open,
  onOpenChange,
  title,
  fields,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: { id: string; label: string; required?: boolean }[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) setValues({});
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {fields.map((f) => (
            <div key={f.id} className="space-y-2">
              <Label htmlFor={f.id}>{f.label}</Label>
              <Input
                id={f.id}
                value={values[f.id] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                required={f.required}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductDialog({ open, onOpenChange, product, categories, brands, units, onSave, onLookupsChange }: ProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [quickCreate, setQuickCreate] = React.useState<"category" | "brand" | "unit" | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      categoryId: "none",
      brandId: "none",
      unitId: "none",
      description: "",
      sellingPrice: 0,
      costPrice: 0,
      reorderLevel: 0,
      expiryDate: "",
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (product) {
      const vals = { ...product };
      if (vals.expiryDate) vals.expiryDate = vals.expiryDate.slice(0, 10);
      if (!vals.categoryId) vals.categoryId = "none";
      if (!vals.brandId) vals.brandId = "none";
      if (!vals.unitId) vals.unitId = "none";
      reset(vals);
    } else {
      reset({
        name: "",
        sku: "",
        categoryId: "none",
        brandId: "none",
        unitId: "none",
        description: "",
        sellingPrice: 0,
        costPrice: 0,
        reorderLevel: 0,
        expiryDate: "",
        isActive: true,
      });
    }
  }, [product, reset, open]);

  const categoryIdVal = watch("categoryId");
  const brandIdVal = watch("brandId");
  const unitIdVal = watch("unitId");
  const isActiveVal = watch("isActive");

  const handleQuickCreate = async (data: Record<string, string>) => {
    const endpoint = quickCreate === "category"
      ? "/api/tenant/inventory/categories"
      : quickCreate === "brand"
        ? "/api/tenant/inventory/brands"
        : "/api/tenant/inventory/units";

    const body = quickCreate === "unit"
      ? { name: data.name, abbreviation: data.abbreviation }
      : { name: data.name };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create");
    onLookupsChange?.();
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" {...register("name")} placeholder="Product name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="e.g. SHMP-001" />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message as string}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Product description..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Category</Label>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => setQuickCreate("category")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <SearchableSelect
                value={categoryIdVal || "none"}
                onValueChange={(val) => setValue("categoryId", val === "none" ? "" : val)}
                options={[
                  { value: "none", label: "None" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Select category"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Brand</Label>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => setQuickCreate("brand")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <SearchableSelect
                value={brandIdVal || "none"}
                onValueChange={(val) => setValue("brandId", val === "none" ? "" : val)}
                options={[
                  { value: "none", label: "None" },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
                placeholder="Select brand"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unit</Label>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => setQuickCreate("unit")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <SearchableSelect
                value={unitIdVal || "none"}
                onValueChange={(val) => setValue("unitId", val === "none" ? "" : val)}
                options={[
                  { value: "none", label: "None" },
                  ...units.map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` })),
                ]}
                placeholder="Select unit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input id="sellingPrice" type="number" step="50" min="0" {...register("sellingPrice", { valueAsNumber: true })} />
              {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input id="costPrice" type="number" step="50" min="0" {...register("costPrice", { valueAsNumber: true })} />
              {errors.costPrice && <p className="text-xs text-destructive">{errors.costPrice.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input id="reorderLevel" type="number" {...register("reorderLevel", { valueAsNumber: true })} />
              {errors.reorderLevel && <p className="text-xs text-destructive">{errors.reorderLevel.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input id="expiryDate" type="date" {...register("expiryDate")} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Product</Label>
              <p className="text-xs text-muted-foreground">Product is available for transactions.</p>
            </div>
            <Switch checked={isActiveVal} onCheckedChange={(val) => setValue("isActive", val)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <QuickCreateDialog
        open={quickCreate === "category"}
        onOpenChange={(o) => { if (!o) setQuickCreate(null); }}
        title="New Category"
        fields={[{ id: "name", label: "Category Name", required: true }]}
        onSubmit={handleQuickCreate}
      />
      <QuickCreateDialog
        open={quickCreate === "brand"}
        onOpenChange={(o) => { if (!o) setQuickCreate(null); }}
        title="New Brand"
        fields={[{ id: "name", label: "Brand Name", required: true }]}
        onSubmit={handleQuickCreate}
      />
      <QuickCreateDialog
        open={quickCreate === "unit"}
        onOpenChange={(o) => { if (!o) setQuickCreate(null); }}
        title="New Unit"
        fields={[
          { id: "name", label: "Unit Name", required: true },
          { id: "abbreviation", label: "Abbreviation", required: true },
        ]}
        onSubmit={handleQuickCreate}
      />
    </Dialog>
  );
}
