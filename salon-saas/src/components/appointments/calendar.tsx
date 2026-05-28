"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { AppointmentPanel } from "./appointment-panel";
import { BookingModal } from "./booking-modal";
import { WalkinModal } from "./walkin-modal";
import { Calendar as CalendarIcon, UserCheck, Plus } from "lucide-react";

export function AppointmentCalendar() {
  const [view, setView] = React.useState<"day" | "week" | "staff">("day");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);
  const [isWalkinOpen, setIsWalkinOpen] = React.useState(false);
  const [selectedAppt, setSelectedAppt] = React.useState<any | null>(null);

  // Fetch all dependencies
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/tenant/branches").then(res => res.json())
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json())
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetch("/api/tenant/services").then(res => res.json())
  });

  // Query appointments
  const { data: apptsData, refetch } = useQuery({
    queryKey: ["appointments", selectedDate, view],
    queryFn: () =>
      fetch(`/api/tenant/appointments?date=${selectedDate}&view=${view}`).then(res => res.json())
  });

  const appts = apptsData?.data || [];
  const branches = branchesData?.data || [];
  const staffList = staffData?.data || [];
  const services = servicesData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments Matrix</h2>
          <p className="text-sm text-muted-foreground">Manage your stylist allocations and calendar slots.</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => setIsBookingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Book Appointment
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsWalkinOpen(true)}>
            <UserCheck className="h-4 w-4 mr-2" /> Quick Walk-In
          </Button>
        </div>
      </div>

      {/* Selector view and date */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="flex gap-2">
          <Button size="sm" variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")}>Day View</Button>
          <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Week View</Button>
        </div>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
        </div>
      </div>

      {/* Real Appointments Grid */}
      <Card>
        <CardContent className="p-6">
          {appts.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              No appointments booked for this view. Click "Book Appointment" to schedule one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appts.map((appt: any) => (
                <Sheet key={appt.id}>
                  <SheetTrigger asChild>
                    <Card className="cursor-pointer hover:border-primary/50 transition-all border-l-4" style={{
                      borderLeftColor: appt.status === "scheduled" ? "#3b82f6" : appt.status === "confirmed" ? "#14b8a6" : appt.status === "in_progress" ? "#f59e0b" : "#10b981"
                    }} onClick={() => setSelectedAppt(appt)}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-sm">{appt.customer?.name}</span>
                          <Badge variant="outline">{appt.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with {appt.staff?.user?.name || "Any Stylist"}
                        </p>
                        <p className="text-xs font-semibold">{appt.services?.map((s: any) => s.name).join(", ")}</p>
                      </CardContent>
                    </Card>
                  </SheetTrigger>
                  {selectedAppt && (
                    <AppointmentPanel appointment={selectedAppt} onRefresh={refetch} />
                  )}
                </Sheet>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BookingModal
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        branches={branches}
        staffList={staffList}
        services={services}
        onSuccess={refetch}
      />

      <WalkinModal
        open={isWalkinOpen}
        onOpenChange={setIsWalkinOpen}
        branches={branches}
        staffList={staffList}
        services={services}
        onSuccess={refetch}
      />
    </div>
  );
}
