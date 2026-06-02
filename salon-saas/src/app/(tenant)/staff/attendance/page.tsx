"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BoneyardTable } from "@/components/ui/boneyard";

export default function AttendanceManagerPage() {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);

  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const staffList = staffData?.data || [];

  const handleBulkCheckin = async () => {
    try {
      const records = staffList.map((s: any) => ({
        staffId: s.id,
        date: selectedDate,
        status: "present"
      }));

      const res = await fetch("/api/tenant/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });

      if (!res.ok) throw new Error();
      toast.success("Successfully checked-in all active stylists!");
    } catch {
      toast.error("Failed to check-in stylists.");
    }
  };

  if (isLoading) {
    return <BoneyardTable rows={5} cols={3} />;
  }

  return (
    <FeatureGate feature="ATTENDANCE">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Staff Attendance</h2>
            <p className="text-sm text-muted-foreground">Mark daily check-in and check-outs for active branches.</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-xs bg-card"
            />
            <Button size="sm" onClick={handleBulkCheckin}>Auto Mark Present</Button>
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
                  <TableHead className="text-right">Mark Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-sm">{s.user?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.designation}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => toast.success("Marked present")}>
                        Present
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
