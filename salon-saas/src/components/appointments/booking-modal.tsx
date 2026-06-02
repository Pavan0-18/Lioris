"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: any[];
  staffList: any[];
  services: any[];
  onSuccess?: () => void;
}

export function BookingModal({ open, onOpenChange, branches, staffList, services, onSuccess }: BookingModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any | null>(null);
  const [searchPhone, setSearchPhone] = React.useState("");
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      customerId: "",
      branchId: "",
      staffId: "",
      serviceIds: [] as string[],
      startTime: "",
      notes: ""
    }
  });

  const watchBranchId = watch("branchId");
  const watchStaffId = watch("staffId");
  const watchServiceIds = watch("serviceIds");
  const watchStartTime = watch("startTime");

  // Sync selected customer ID to form
  React.useEffect(() => {
    if (selectedCustomer) {
      setValue("customerId", selectedCustomer.id);
    }
  }, [selectedCustomer, setValue]);

  // Set default branch
  React.useEffect(() => {
    if (branches.length > 0 && !watchBranchId) {
      setValue("branchId", branches[0].id);
    }
  }, [branches, watchBranchId, setValue]);

  // Phone search
  const handlePhoneSearch = async () => {
    if (!searchPhone) return;
    try {
      const res = await fetch(`/api/tenant/customers?search=${searchPhone}`);
      const json = await res.json();
      setCustomers(json.data || []);
      if ((json.data || []).length === 0) {
        toast.info("No customer found. You can enter details below to create one.");
      }
    } catch {
      toast.error("Failed to query customer database.");
    }
  };

  // Fetch slots on branch/staff/services change
  React.useEffect(() => {
    const fetchSlots = async () => {
      if (!watchBranchId || !watchStaffId || watchServiceIds.length === 0) return;
      setLoadingSlots(true);
      try {
        const duration = services
          .filter(s => watchServiceIds.includes(s.id))
          .reduce((sum, s) => sum + s.duration, 0);

        const dateStr = new Date().toISOString().split("T")[0]; // default today
        const res = await fetch(
          `/api/tenant/appointments/availability?branchId=${watchBranchId}&staffId=${watchStaffId}&duration=${duration}&date=${dateStr}`
        );
        const json = await res.json();
        setAvailableSlots(json.data?.slots || []);
      } catch {
        toast.error("Failed to calculate time slots.");
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [watchBranchId, watchStaffId, watchServiceIds, services]);

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;
    const phone = data.get("phone") as string;

    if (!name || !phone) {
      toast.error("Please fill name and phone");
      return;
    }

    try {
      const res = await fetch("/api/tenant/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSelectedCustomer(json.data);
      toast.success("Customer profile registered!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to create profile.");
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "" && !(Array.isArray(v) && v.length === 0))
      );
      const res = await fetch("/api/tenant/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Appointment booked successfully!");
      onOpenChange(false);
      reset();
      setStep(1);
      setSelectedCustomer(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) { setStep(1); setSelectedCustomer(null); } }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Appointment — Step {step} of 4</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <Label>Find Existing Customer</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
              <Button type="button" onClick={handlePhoneSearch}>Search</Button>
            </div>

            {customers.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:bg-muted" onClick={() => { setSelectedCustomer(c); setStep(2); }}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <Button size="sm">Select</Button>
                </CardContent>
              </Card>
            ))}

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold mb-2">Create New Customer Fallback</p>
              <form onSubmit={handleCreateCustomer} className="space-y-2">
                <Input name="name" placeholder="Full Name" required />
                <Input name="phone" placeholder="Phone Number" required />
                <Button type="submit" className="w-full">Create and Select</Button>
              </form>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <p className="text-sm">Selected: <strong>{selectedCustomer?.name}</strong></p>
            <Label className="text-base font-semibold">Select Services</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {services.map((s) => (
                <div key={s.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                  <Checkbox
                    id={`s-${s.id}`}
                    checked={watchServiceIds.includes(s.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue("serviceIds", [...watchServiceIds, s.id]);
                      } else {
                        setValue("serviceIds", watchServiceIds.filter(id => id !== s.id));
                      }
                    }}
                  />
                  <Label htmlFor={`s-${s.id}`} className="flex-1 cursor-pointer">
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{s.name}</span>
                      <span className="text-sm text-primary font-semibold">${s.price}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.duration} mins</span>
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={watchServiceIds.length === 0} onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <p className="text-sm">Services: <strong>{watchServiceIds.length} selected</strong></p>

            <div className="space-y-2">
              <Label>Select Staff Stylist</Label>
              <Select value={watchStaffId} onValueChange={(val) => setValue("staffId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Stylist" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.user?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Branch</Label>
              <Select value={watchBranchId} onValueChange={(val) => setValue("branchId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Available Slots Grid</Label>
              {loadingSlots ? (
                <p className="text-sm">Calculating slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No available slots for this stylist on this branch today.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const timeOnly = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <Button
                        key={slot}
                        type="button"
                        variant={watchStartTime === slot ? "default" : "outline"}
                        className="text-xs h-8 px-1"
                        onClick={() => setValue("startTime", slot)}
                      >
                        {timeOnly}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button disabled={!watchStartTime} onClick={() => setStep(4)}>Next</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-4">
            <Card>
              <CardContent className="p-6 space-y-3">
                <h4 className="font-semibold text-lg border-b pb-2">Booking Summary</h4>
                <p className="text-sm">Customer: <strong>{selectedCustomer?.name}</strong></p>
                <p className="text-sm">Phone: <strong>{selectedCustomer?.phone}</strong></p>
                <p className="text-sm">Stylist: <strong>{staffList.find(s => s.id === watchStaffId)?.name || "Any Stylist"}</strong></p>
                <p className="text-sm">Time: <strong>{new Date(watchStartTime).toLocaleString()}</strong></p>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Services:</p>
                  <ul className="text-xs list-disc list-inside">
                    {services.filter(s => watchServiceIds.includes(s.id)).map(s => (
                      <li key={s.id}>{s.name} (${s.price})</li>
                    ))}
                  </ul>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm">
                  <span>Total Amount</span>
                  <span>
                    ${services.filter(s => watchServiceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Requests/Notes</Label>
              <Input id="notes" {...register("notes")} placeholder="Optional appointment notes..." />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleSubmit(onSubmit)}>Confirm & Book</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
