"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createServiceSchema } from "@/lib/validators/service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: any;
  categories: { id: string; name: string }[];
  onSave: (data: any) => void;
}

export function ServiceModal({ open, onOpenChange, service, categories, onSave }: ServiceModalProps) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createServiceSchema),
    defaultValues: service || {
      name: "",
      categoryId: "",
      duration: 30,
      price: 0,
      taxable: true,
      description: ""
    }
  });

  React.useEffect(() => {
    if (service) {
      reset(service);
    } else {
      reset({
        name: "",
        categoryId: "",
        duration: 30,
        price: 0,
        taxable: true,
        description: ""
      });
    }
  }, [service, reset, open]);

  const onSubmit = (data: any) => {
    onSave(data);
    onOpenChange(false);
  };

  const taxableVal = watch("taxable");
  const categoryIdVal = watch("categoryId");
  const durationVal = watch("duration");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Add New Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Haircut & Trim" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryIdVal} onValueChange={(val) => setValue("categoryId", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Min)</Label>
              <Select value={String(durationVal)} onValueChange={(val) => setValue("duration", Number(val) as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 75, 90, 120].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} mins</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.duration && <p className="text-xs text-destructive">{errors.duration.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price ($ / ₹)</Label>
              <Input id="price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message as string}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="taxable">Taxable Service</Label>
              <p className="text-xs text-muted-foreground">Apply standard tax rates during invoicing.</p>
            </div>
            <Switch checked={taxableVal} onCheckedChange={(val) => setValue("taxable", val)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Short description of service..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
