"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Shift {
  branchId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

interface ShiftSchedulerProps {
  staffId: string;
}

export function ShiftScheduler({ staffId }: ShiftSchedulerProps) {
  const queryClient = useQueryClient();
  const [shifts, setShifts] = React.useState<Shift[]>([]);

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/tenant/branches").then(res => res.json()),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ["shifts", staffId],
    queryFn: () => fetch(`/api/tenant/staff/${staffId}/shifts?staffId=${staffId}`).then(res => res.json()),
  });

  const branches = branchesData?.data || [];

  React.useEffect(() => {
    if (shiftsData?.data) {
      setShifts(shiftsData.data);
    }
  }, [shiftsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/staff/${staffId}/shifts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Shifts saved");
      queryClient.invalidateQueries({ queryKey: ["shifts", staffId] });
    },
    onError: () => toast.error("Failed to save shifts"),
  });

  const addShift = () => {
    setShifts(prev => [...prev, {
      branchId: branches[0]?.id || "",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
    }]);
  };

  const updateShift = (index: number, field: keyof Shift, value: any) => {
    setShifts(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeShift = (index: number) => {
    setShifts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Weekly Shift Schedule</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addShift}>
              <Plus className="w-3 h-3 mr-1" /> Add Shift
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No shifts configured. Click "Add Shift" to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                <Select
                  value={String(shift.dayOfWeek)}
                  onValueChange={(val) => updateShift(idx, "dayOfWeek", Number(val))}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={shift.branchId}
                  onValueChange={(val) => updateShift(idx, "branchId", val)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={shift.startTime}
                  onChange={(e) => updateShift(idx, "startTime", e.target.value)}
                  className="w-24 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={shift.endTime}
                  onChange={(e) => updateShift(idx, "endTime", e.target.value)}
                  className="w-24 h-8 text-xs"
                />
                <Button size="icon" variant="ghost" onClick={() => removeShift(idx)} className="h-8 w-8 text-red-500">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
