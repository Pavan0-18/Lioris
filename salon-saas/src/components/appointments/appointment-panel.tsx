"use client";
import React from "react";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, User, Clock, CheckCircle, XCircle } from "lucide-react";

interface AppointmentPanelProps {
  appointment: any;
  onRefresh?: () => void;
}

export function AppointmentPanel({ appointment, onRefresh }: AppointmentPanelProps) {
  const [notes, setNotes] = React.useState(appointment?.notes || "");
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || "");
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleStatusTransition = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/appointments/${appointment.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Appointment status updated to ${newStatus}!`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async () => {
    try {
      const res = await fetch(`/api/tenant/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Appointment notes saved.");
      setIsEditingNotes(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes.");
    }
  };

  const status = appointment.status;

  return (
    <SheetContent className="w-[400px] sm:w-[540px]">
      <SheetHeader className="pb-4 border-b border-border">
        <SheetTitle className="text-xl">Appointment Details</SheetTitle>
        <SheetDescription>
          Reference ID: {appointment.id}
        </SheetDescription>
      </SheetHeader>

      <div className="py-6 space-y-6 overflow-y-auto max-h-[80vh]">
        {/* Customer Header */}
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {appointment.customer?.name?.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-lg">{appointment.customer?.name}</h4>
            <p className="text-sm text-muted-foreground">{appointment.customer?.phone}</p>
          </div>
        </div>

        {/* Date Time Stylist */}
        <div className="grid grid-cols-2 gap-4 border border-border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">{new Date(appointment.startTime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">
              {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center space-x-2 col-span-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">Stylist: <strong>{appointment.staff?.user?.name || "Any Stylist"}</strong></span>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-muted-foreground">Booked Services</h5>
          <div className="divide-y divide-border">
            {appointment.services?.map((s: any) => (
              <div key={s.id} className="flex justify-between py-2 text-sm">
                <span>{s.name}</span>
                <span className="font-semibold">${s.price || s.appointmentServices?.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Actions */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-muted-foreground">Current Status</span>
            <Badge variant="outline">{status.toUpperCase()}</Badge>
          </div>

          <div className="flex gap-2">
            {status === "scheduled" && (
              <>
                <Button size="sm" onClick={() => handleStatusTransition("confirmed")}>Confirm Booking</Button>
                <Button size="sm" variant="destructive" onClick={() => handleStatusTransition("cancelled")}>Cancel</Button>
              </>
            )}
            {status === "confirmed" && (
              <>
                <Button size="sm" onClick={() => handleStatusTransition("in_progress")}>Start Session</Button>
                <Button size="sm" variant="destructive" onClick={() => handleStatusTransition("no_show")}>No Show</Button>
              </>
            )}
            {status === "in_progress" && (
              <>
                <Button size="sm" onClick={() => handleStatusTransition("completed")}>Mark Completed</Button>
              </>
            )}
            {["completed", "cancelled", "no_show"].includes(status) && (
              <p className="text-xs text-muted-foreground italic">This is a terminal state. No further updates are permitted.</p>
            )}
          </div>
        </div>

        {/* Notes editor */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between items-center">
            <h5 className="text-sm font-semibold text-muted-foreground">Session Notes</h5>
            {!isEditingNotes ? (
              <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(true)}>Edit</Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" onClick={handleUpdateNotes}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {isEditingNotes ? (
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          ) : (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded">
              {appointment.notes || "No special requests or stylist notes entered."}
            </p>
          )}
        </div>
      </div>
    </SheetContent>
  );
}
