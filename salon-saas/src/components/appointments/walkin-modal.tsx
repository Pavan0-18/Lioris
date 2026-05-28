"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createWalkinSchema } from "@/lib/validators/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface WalkinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: any[];
  staffList: any[];
  services: any[];
  onSuccess?: () => void;
}

export function WalkinModal({ open, onOpenChange, branches, staffList, services, onSuccess }: WalkinModalProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    resolver: zodResolver(createWalkinSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      branchId: "",
      serviceIds: [] as string[],
      staffId: "",
      startTime: new Date().toISOString()
    }
  });

  const watchBranchId = watch("branchId");
  const watchStaffId = watch("staffId");
  const watchServiceIds = watch("serviceIds");

  React.useEffect(() => {
    if (branches.length > 0 && !watchBranchId) {
      setValue("branchId", branches[0].id);
    }
  }, [branches, watchBranchId, setValue]);

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch("/api/tenant/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "walkin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Walk-in appointment processed!");
      onOpenChange(false);
      reset();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to process walk-in.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Instant Walk-In Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input id="customerName" {...register("customerName")} placeholder="e.g. John Doe" />
            {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number</Label>
            <Input id="customerPhone" {...register("customerPhone")} placeholder="e.g. 9876543210" />
            {errors.customerPhone && <p className="text-xs text-destructive">{errors.customerPhone.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={watchBranchId} onValueChange={(val) => setValue("branchId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stylist</Label>
              <Select value={watchStaffId} onValueChange={(val) => setValue("staffId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Stylist (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.user?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Services</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
              {services.map((s) => (
                <div key={s.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`walkin-s-${s.id}`}
                    checked={watchServiceIds.includes(s.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue("serviceIds", [...watchServiceIds, s.id]);
                      } else {
                        setValue("serviceIds", watchServiceIds.filter(id => id !== s.id));
                      }
                    }}
                  />
                  <Label htmlFor={`walkin-s-${s.id}`} className="flex-1 cursor-pointer text-xs flex justify-between">
                    <span>{s.name}</span>
                    <span className="font-semibold">${s.price}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Complete Booking</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
