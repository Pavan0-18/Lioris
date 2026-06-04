"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { waitlistCreateSchema } from "@/lib/validators/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

type FormData = z.infer<typeof waitlistCreateSchema>;

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: any[];
  services: any[];
  onSuccess?: () => void;
}

export function WaitlistModal({ open, onOpenChange, branches, services, onSuccess }: WaitlistModalProps) {
  const [loading, setLoading] = React.useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(waitlistCreateSchema),
    defaultValues: {
      branchId: "",
      customerName: "",
      customerPhone: "",
      serviceIds: [],
      preferredDate: "",
      notes: "",
    },
  });

  const selectedServices = watch("serviceIds");

  const toggleService = (serviceId: string) => {
    const current = selectedServices || [];
    if (current.includes(serviceId)) {
      setValue("serviceIds", current.filter((id) => id !== serviceId), { shouldValidate: true });
    } else {
      setValue("serviceIds", [...current, serviceId], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Added to waitlist!");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to add to waitlist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add to Waitlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select onValueChange={(v) => setValue("branchId", v)}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input {...register("customerName")} placeholder="Full name" />
              {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("customerPhone")} placeholder="Phone number" />
              {errors.customerPhone && <p className="text-xs text-destructive">{errors.customerPhone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Services</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
              {services.map((s: any) => (
                <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={selectedServices?.includes(s.id)}
                    onCheckedChange={() => toggleService(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
            {errors.serviceIds && <p className="text-xs text-destructive">{errors.serviceIds.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Preferred Date (optional)</Label>
            <Input type="date" {...register("preferredDate")} />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea {...register("notes")} placeholder="Any preferences..." rows={2} />
          </div>

          <DialogTitle>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add to Waitlist"}</Button>
            </div>
          </DialogTitle>
        </form>
      </DialogContent>
    </Dialog>
  );
}
