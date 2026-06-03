"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentCalendar } from "@/components/appointments/calendar";
import { AppointmentKanban } from "@/components/appointments/appointment-kanban";
import { CalendarDays, Columns3 } from "lucide-react";

type View = "calendar" | "board";

export default function AppointmentsPage() {
  const [view, setView] = React.useState<View>("calendar");

  React.useEffect(() => {
    const saved = localStorage.getItem("appointments-view");
    if (saved === "calendar" || saved === "board") setView(saved);
  }, []);

  const { data: countData } = useQuery({
    queryKey: ["appointments-today-count"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/tenant/appointments?date=${today}&limit=200`);
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const todayCount = Array.isArray(countData?.data) ? countData.data.length : 0;

  const handleViewChange = (newView: View) => {
    setView(newView);
    localStorage.setItem("appointments-view", newView);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "1") { e.preventDefault(); handleViewChange("calendar"); }
      if (e.key === "2") { e.preventDefault(); handleViewChange("board"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <FeatureGate feature="APPOINTMENTS">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
              <p className="text-sm text-muted-foreground">
                {view === "calendar" ? "Manage your stylist allocations and calendar slots." : "Drag appointments between columns to update status."}
              </p>
            </div>
            {todayCount > 0 && (
              <Badge variant="secondary" className="self-start mt-1 text-xs">
                {todayCount} today
              </Badge>
            )}
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button
              size="sm"
              variant={view === "calendar" ? "default" : "ghost"}
              onClick={() => handleViewChange("calendar")}
              className="gap-1.5"
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              size="sm"
              variant={view === "board" ? "default" : "ghost"}
              onClick={() => handleViewChange("board")}
              className="gap-1.5"
            >
              <Columns3 className="h-4 w-4" />
              Board
            </Button>
          </div>
        </div>
        {view === "calendar" ? <AppointmentCalendar /> : <AppointmentKanban />}
      </div>
    </FeatureGate>
  );
}
