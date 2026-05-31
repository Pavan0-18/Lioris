"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStaffSchema } from "@/lib/validators/staff";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: any[];
  services: any[];
  onSuccess?: () => void;
}

export function AddStaffModal({ open, onOpenChange, branches, services, onSuccess }: AddStaffModalProps) {
  const [activeTab, setActiveTab] = React.useState("create");
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  const [commissionRates, setCommissionRates] = React.useState<Record<string, number>>({});

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "STYLIST",
      branchId: "",
      designation: "Stylist",
      employeeCode: "",
      baseSalary: 1500,
      salaryType: "monthly",
      commissionType: "percentage"
    }
  });

  const watchRole = watch("role");
  const watchBranchId = watch("branchId");

  React.useEffect(() => {
    if (branches.length > 0 && !watchBranchId) {
      setValue("branchId", branches[0].id);
    }
  }, [branches, watchBranchId, setValue]);

  const handleCommissionChange = (serviceId: string, rate: number) => {
    setCommissionRates(prev => ({ ...prev, [serviceId]: rate }));
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        services: selectedServices.map(serviceId => ({
          serviceId,
          commissionPct: commissionRates[serviceId] || 0
        }))
      };

      const res = await fetch("/api/tenant/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Staff member registered successfully!");
      onOpenChange(false);
      reset();
      setSelectedServices([]);
      setCommissionRates({});
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to register staff.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Profile</TabsTrigger>
            <TabsTrigger value="services">Assign Services</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Ashley Jenkins" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register("email")} placeholder="ashley@salon.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input id="password" type="password" {...register("password")} placeholder="At least 8 chars" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={watchRole} onValueChange={(val) => setValue("role", val as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {["OWNER", "MANAGER", "RECEPTIONIST", "STYLIST"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Branch Allocation</Label>
                <Select value={watchBranchId} onValueChange={(val) => setValue("branchId", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" {...register("designation")} placeholder="e.g. Master Stylist" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeCode">Employee Code</Label>
                <Input id="employeeCode" {...register("employeeCode")} placeholder="e.g. EMP04" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="baseSalary">Base Salary</Label>
                <Input id="baseSalary" type="number" {...register("baseSalary", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select value={watch("salaryType")} onValueChange={(val) => setValue("salaryType", val as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Salary Type" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="monthly">Monthly Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly wage</SelectItem>
                    <SelectItem value="fixed">Fixed base</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setActiveTab("services")}>Next: Assign Services</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="services" className="space-y-4 py-4">
            <Label className="text-sm font-semibold mb-2">Configure Stylist Services & Commission Rates</Label>
            <div className="space-y-3 max-h-60 overflow-y-auto border rounded p-3">
              {services.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`chk-${s.id}`}
                      checked={selectedServices.includes(s.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedServices(prev => [...prev, s.id]);
                        } else {
                          setSelectedServices(prev => prev.filter(id => id !== s.id));
                        }
                      }}
                    />
                    <Label htmlFor={`chk-${s.id}`} className="text-xs cursor-pointer">{s.name}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Comm %</span>
                    <Input
                      type="number"
                      disabled={!selectedServices.includes(s.id)}
                      value={commissionRates[s.id] || 0}
                      onChange={(e) => handleCommissionChange(s.id, Number(e.target.value))}
                      className="w-16 h-7 text-xs text-center"
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveTab("create")}>Back</Button>
              <Button onClick={handleSubmit(onSubmit)}>Save Stylist</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
