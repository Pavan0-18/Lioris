"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema } from "@/lib/validators/inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  defaultValues?: any;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  units: { id: string; name: string; abbreviation: string }[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProductForm({ defaultValues, categories, brands, units, onSubmit, isSubmitting }: ProductFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(createProductSchema),
    defaultValues: defaultValues || {
      name: "",
      sku: "",
      categoryId: "",
      brandId: "",
      unitId: "",
      description: "",
      sellingPrice: 0,
      costPrice: 0,
      reorderLevel: 0,
      expiryDate: "",
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (defaultValues) {
      const vals = { ...defaultValues };
      if (vals.expiryDate) vals.expiryDate = vals.expiryDate.slice(0, 10);
      Object.entries(vals).forEach(([key, val]) => setValue(key as any, val));
    }
  }, [defaultValues, setValue]);

  const categoryIdVal = watch("categoryId");
  const brandIdVal = watch("brandId");
  const unitIdVal = watch("unitId");
  const isActiveVal = watch("isActive");

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select value={categoryIdVal} onValueChange={(val) => setValue("categoryId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <Select value={brandIdVal} onValueChange={(val) => setValue("brandId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitId">Unit</Label>
              <Select value={unitIdVal} onValueChange={(val) => setValue("unitId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice", { valueAsNumber: true })} />
              {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input id="costPrice" type="number" step="0.01" {...register("costPrice", { valueAsNumber: true })} />
              {errors.costPrice && <p className="text-xs text-destructive">{errors.costPrice.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
