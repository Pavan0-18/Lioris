"use client";
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPurchaseOrderSchema } from "@/lib/validators/purchase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface PurchaseFormProps {
  vendors: { id: string; name: string }[];
  products: { id: string; name: string; sku: string }[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function PurchaseForm({ vendors, products, onSubmit, isSubmitting, onCancel }: PurchaseFormProps) {
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      vendorId: "",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [{ productId: "", quantity: 1, unitCost: 0, totalCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items");

  const updateTotalCost = (index: number) => {
    const qty = items[index]?.quantity || 0;
    const cost = items[index]?.unitCost || 0;
    setValue(`items.${index}.totalCost`, qty * cost);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vendorId">Vendor</Label>
          <Select value={watch("vendorId")} onValueChange={(val) => setValue("vendorId", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input id="invoiceNumber" {...register("invoiceNumber")} placeholder="INV-001" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: "", quantity: 1, unitCost: 0, totalCost: 0 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {errors.items && <p className="text-xs text-destructive">{errors.items.message as string}</p>}

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-start p-3 border rounded-lg">
            <div className="flex-1 space-y-2">
              <Label className="text-xs">Product</Label>
              <Select
                value={items[index]?.productId}
                onValueChange={(val) => setValue(`items.${index}.productId`, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-24 space-y-2">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min="1"
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                onChange={(e) => {
                  register(`items.${index}.quantity`).onChange(e);
                  updateTotalCost(index);
                }}
              />
            </div>

            <div className="w-28 space-y-2">
              <Label className="text-xs">Unit Cost</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                onChange={(e) => {
                  register(`items.${index}.unitCost`).onChange(e);
                  updateTotalCost(index);
                }}
              />
            </div>

            <div className="w-28 space-y-2">
              <Label className="text-xs">Total</Label>
              <Input
                type="number"
                step="0.01"
                {...register(`items.${index}.totalCost`, { valueAsNumber: true })}
                readOnly
                className="bg-muted"
              />
            </div>

            {fields.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Optional notes..." rows={2} />
      </div>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Purchase Order
        </Button>
      </div>
    </form>
  );
}
