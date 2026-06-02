"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { AppointmentCalendar } from "@/components/appointments/calendar";
import { AppointmentKanban } from "@/components/appointments/appointment-kanban";
import { CalendarDays, Columns3 } from "lucide-react";

type View = "calendar" | "board";

export default function AppointmentsPage() {
  const [view, setView] = React.useState<View>("calendar");

  return (
    <FeatureGate feature="APPOINTMENTS">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
            <p className="text-sm text-muted-foreground">
              {view === "calendar" ? "Manage your stylist allocations and calendar slots." : "Drag appointments between columns to update status."}
            </p>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button
              size="sm"
              variant={view === "calendar" ? "default" : "ghost"}
              onClick={() => setView("calendar")}
              className="gap-1.5"
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              size="sm"
              variant={view === "board" ? "default" : "ghost"}
              onClick={() => setView("board")}
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
