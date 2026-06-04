"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BoneyardTable } from "@/components/ui/boneyard";
import { Download, LogIn, LogOut, Loader2 } from "lucide-react";

export default function AttendanceManagerPage() {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);

  const { data: staffData, isLoading, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { refetch: refetchAttendance } = useQuery({
    queryKey: ["attendance-summary", selectedDate],
    queryFn: () => fetch(`/api/tenant/attendance/export?date=${selectedDate}`),
    enabled: false,
  });

  const staffList = staffData?.data || [];

  const handleIndividualCheck = async (staffId: string, type: "checkin" | "checkout") => {
    try {
      const res = await fetch("/api/tenant/attendance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, date: selectedDate, type }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${type === "checkin" ? "Checked in" : "Checked out"} successfully`);
      refetch();
    } catch {
      toast.error(`Failed to ${type === "checkin" ? "check in" : "check out"}`);
    }
  };

  const handleBulkCheckin = async () => {
    try {
      const results = await Promise.all(
        staffList.map((s: any) =>
          fetch("/api/tenant/attendance/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: s.id, date: selectedDate, type: "checkin" }),
          })
        )
      );
      const allOk = results.every(r => r.ok);
      if (allOk) {
        toast.success("All staff checked in!");
        refetch();
      } else {
        toast.error("Some check-ins failed");
      }
    } catch {
      toast.error("Failed to bulk check-in");
    }
  };

  const handleExport = async () => {
    try {
      const d = new Date(selectedDate);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const res = await fetch(`/api/tenant/attendance/export?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timesheet_${month}_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Timesheet exported");
    } catch {
      toast.error("Failed to export timesheet");
    }
  };

  if (isLoading) {
    return <BoneyardTable rows={5} cols={4} />;
  }

  return (
    <FeatureGate feature="ATTENDANCE">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Staff Attendance</h2>
            <p className="text-sm text-muted-foreground">Individual check-in/check-out for active staff.</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-xs bg-card"
            />
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="w-3 h-3 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={handleBulkCheckin}>
              <LogIn className="w-3 h-3 mr-1" /> Bulk Check-in
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Status — {new Date(selectedDate).toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stylist Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.designation || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px]">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIndividualCheck(s.id, "checkin")}
                      >
                        <LogIn className="w-3 h-3 mr-1" /> Check In
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIndividualCheck(s.id, "checkout")}
                      >
                        <LogOut className="w-3 h-3 mr-1" /> Check Out
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
