"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AttendanceCalendarProps {
  staffId: string;
}

export function AttendanceCalendar({ staffId }: AttendanceCalendarProps) {
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  const { data: attData, refetch } = useQuery({
    queryKey: ["attendance", staffId, selectedMonth, selectedYear],
    queryFn: () =>
      fetch(`/api/tenant/staff/${staffId}?month=${selectedMonth}&year=${selectedYear}`).then(res => res.json())
  });

  const attendanceRecords = attData?.data?.attendance || [];

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleMarkAttendance = async (day: number, status: string, note: string) => {
    try {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const res = await fetch("/api/tenant/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ staffId, date: dateStr, status, note }]),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Attendance marked!");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save attendance.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-sm">Monthly Attendance Grid</h4>
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {new Date(2000, i, 1).toLocaleString("default", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {daysArray.map((day) => {
          const record = attendanceRecords.find((r: any) => new Date(r.date).getDate() === day);
          const status = record?.status || "unmarked";

          const dotColors: Record<string, string> = {
            present: "bg-green-500",
            absent: "bg-red-500",
            half_day: "bg-yellow-500",
            leave: "bg-blue-500",
            unmarked: "bg-slate-300"
          };

          return (
            <Popover key={day}>
              <PopoverTrigger asChild>
                <Card className="cursor-pointer hover:border-primary transition-all">
                  <CardContent className="p-3 flex flex-col items-center justify-center gap-1 min-h-[60px]">
                    <span className="text-xs font-semibold">{day}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColors[status]}`} />
                  </CardContent>
                </Card>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-4 space-y-3">
                <h5 className="font-semibold text-xs border-b pb-2">Mark Attendance — Day {day}</h5>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Status</label>
                  <Select defaultValue={record?.status || "present"} onValueChange={(val) => handleMarkAttendance(day, val, "")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present (Green)</SelectItem>
                      <SelectItem value="absent">Absent (Red)</SelectItem>
                      <SelectItem value="half_day">Half Day (Yellow)</SelectItem>
                      <SelectItem value="leave">On Leave (Blue)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
