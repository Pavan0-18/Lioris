"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, UserCheck, CalendarIcon, GripVertical, Timer } from "lucide-react";
import { AppointmentPanel } from "./appointment-panel";
import { BookingModal } from "./booking-modal";
import { WalkinModal } from "./walkin-modal";
import { WaitlistModal } from "./waitlist-modal";
import { BoneyardPage } from "@/components/ui/boneyard";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function isSoon(startTime: string) {
  const diff = new Date(startTime).getTime() - Date.now();
  return diff > 0 && diff <= 30 * 60 * 1000;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function formatHour(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h;
  return `${h12}:00 ${ampm}`;
}

export function AppointmentCalendar() {
  const queryClient = useQueryClient();
  const [view, setView] = React.useState<"day" | "week" | "timeline">("day");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);
  const [isWalkinOpen, setIsWalkinOpen] = React.useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = React.useState(false);
  const [selectedAppt, setSelectedAppt] = React.useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = React.useState("");

  useRealtimeAppointments();

  const { data: batchData, isLoading, refetch } = useQuery({
    queryKey: ["appointments-batch", selectedDate, view],
    queryFn: async () => {
      const response = await fetch("/api/tenant/batch?resources=branches,staff,services,appointments", {
        method: "GET",
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30000,
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, startTime, staffId }: { id: string; startTime: string; staffId?: string }) => {
      const res = await fetch(`/api/tenant/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, staffId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-batch", selectedDate, view] });
      refetch();
      toast.success("Appointment rescheduled!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reschedule.");
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const res = await fetch("/api/tenant/appointments/bulk/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-batch", selectedDate, view] });
      refetch();
      setSelectedIds(new Set());
      setBulkStatus("");
      toast.success("Appointments updated!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update appointments.");
    },
  });

  const appts = batchData?.data?.appointments || [];
  const branches = batchData?.data?.branches || [];
  const staffList = batchData?.data?.staff || [];
  const services = batchData?.data?.services || [];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key.toLowerCase() === "b") { e.preventDefault(); setIsBookingOpen(true); }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); setIsWalkinOpen(true); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCardClick = (appt: any) => {
    setSelectedAppt(appt);
    setIsSheetOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDropReschedule = (e: React.DragEvent, targetHour: number, targetStaffId?: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const appt = appts.find((a: any) => a.id === data.apptId);
      if (!appt) return;
      const original = new Date(appt.startTime);
      const newStart = new Date(selectedDate);
      newStart.setHours(targetHour, original.getMinutes(), 0, 0);
      rescheduleMutation.mutate({
        id: data.apptId,
        startTime: newStart.toISOString(),
        staffId: targetStaffId,
      });
    } catch {}
  };

  if (isLoading) {
    return <BoneyardPage />;
  }

  const soonGlowClass = (startTime: string) =>
    isSoon(startTime) ? "ring-2 ring-amber-400/50 cal-card-soon" : "";

  return (
    <>
      <style>{`
        @keyframes soon-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(251, 191, 36, 0.3), 0 0 8px rgba(251, 191, 36, 0.1); }
          50% { box-shadow: 0 0 8px rgba(251, 191, 36, 0.6), 0 0 16px rgba(251, 191, 36, 0.2); }
        }
        .cal-card-soon {
          animation: soon-glow 2s ease-in-out infinite;
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={() => setIsBookingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Book
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsWalkinOpen(true)}>
              <UserCheck className="h-4 w-4 mr-2" /> Walk-In
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsWaitlistOpen(true)}>
              <Timer className="h-4 w-4 mr-2" /> Waitlist
            </Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")}>Day</Button>
            <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Week</Button>
            <Button size="sm" variant={view === "timeline" ? "default" : "outline"} onClick={() => setView("timeline")}>
              <Timer className="h-3.5 w-3.5 mr-1" /> Timeline
            </Button>
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

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Update status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirm</SelectItem>
                <SelectItem value="cancelled">Cancel</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="completed">Complete</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkStatus}
              onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: bulkStatus })}
            >
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkStatus(""); }}>
              Clear
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {appts.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                No appointments booked for this view.
              </div>
            ) : view === "day" ? (
              <div className="min-w-[500px]">
                <div className="flex border-b sticky top-0 bg-card z-10">
                  <div className="w-16 shrink-0 p-2 text-[10px] font-medium text-muted-foreground uppercase">Time</div>
                  <div className="flex-1 p-2 text-[10px] font-medium text-muted-foreground uppercase">Appointments</div>
                </div>
                {HOURS.map((hour) => {
                  const hourAppts = appts.filter((a: any) => new Date(a.startTime).getHours() === hour);
                  return (
                    <div
                      key={hour}
                      className="flex border-b last:border-b-0 min-h-[60px] transition-colors hover:bg-muted/20"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropReschedule(e, hour)}
                    >
                      <div className="w-16 shrink-0 p-2 text-[11px] text-muted-foreground border-r flex items-start pt-3">
                        {formatHour(hour)}
                      </div>
                      <div className="flex-1 p-1.5 space-y-1">
                        {hourAppts.map((appt: any) => (
                          <div
                            key={appt.id}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ apptId: appt.id })); }}
                            onClick={() => handleCardClick(appt)}
                            className={`flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10 hover:bg-primary/10 cursor-grab active:cursor-grabbing transition-colors text-xs group ${soonGlowClass(appt.startTime)}`}
                          >
                            <Checkbox
                              checked={selectedIds.has(appt.id)}
                              onCheckedChange={() => toggleSelect(appt.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            />
                            <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-foreground truncate">{appt.customer?.name}</div>
                                {isSoon(appt.startTime) && (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                    Soon
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                <span>{new Date(appt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                {appt.staff?.user?.name && <><span className="text-muted-foreground/40">|</span><span className="truncate">{appt.staff.user.name}</span></>}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{appt.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : view === "timeline" ? (
              <div className="min-w-[900px] p-4">
                <div className="flex border-b sticky top-0 bg-card z-10">
                  <div className="w-32 shrink-0 p-2 text-xs font-medium text-muted-foreground">Staff</div>
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex-1 p-2 text-[10px] text-muted-foreground text-center border-l">
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>
                {staffList.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">No staff configured</div>
                )}
                {staffList.map((staff: any) => (
                  <div key={staff.id} className="flex border-b min-h-[52px] hover:bg-muted/10">
                    <div className="w-32 shrink-0 p-2 text-xs font-medium truncate border-r flex items-center">
                      {staff.user?.name}
                    </div>
                    {HOURS.map((hour) => {
                      const slotAppts = appts.filter((a: any) => {
                        if (a.staffId !== staff.id) return false;
                        const h = new Date(a.startTime).getHours();
                        const startMin = new Date(a.startTime).getMinutes();
                        return h === hour || (h === hour - 1 && startMin > 0);
                      });
                      return (
                        <div
                          key={hour}
                          className="flex-1 p-1 border-l relative min-h-[52px]"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropReschedule(e, hour, staff.id)}
                        >
                          {slotAppts.map((appt: any) => {
                            const startH = new Date(appt.startTime).getHours();
                            const duration = (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 3600000;
                            const left = ((startH - HOURS[0]) / HOURS.length) * 100;
                            const width = Math.max(duration / HOURS.length * 100, 8);
                            return (
                              <div
                                key={appt.id}
                                draggable
                                onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ apptId: appt.id })); }}
                                onClick={() => handleCardClick(appt)}
                                className={`absolute top-1 h-[42px] rounded bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-grab active:cursor-grabbing transition-colors text-[10px] p-1 overflow-hidden flex items-center gap-1 ${soonGlowClass(appt.startTime)}`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                              >
                                <Checkbox
                                  checked={selectedIds.has(appt.id)}
                                  onCheckedChange={() => toggleSelect(appt.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 scale-75"
                                />
                                <span className="font-medium truncate">{appt.customer?.name}</span>
                                {isSoon(appt.startTime) && (
                                  <span className="text-[8px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400 px-1 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                    Soon
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {appts.map((appt: any) => (
                    <div
                      key={appt.id}
                      onClick={() => handleCardClick(appt)}
                      className={`cursor-pointer hover:border-primary/50 transition-all border-l-4 rounded-lg border bg-card p-4 space-y-2 shadow-sm ${soonGlowClass(appt.startTime)}`}
                      style={{
                        borderLeftColor: appt.status === "scheduled" ? "#3b82f6" : appt.status === "confirmed" ? "#14b8a6" : appt.status === "in_progress" ? "#f59e0b" : "#10b981"
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedIds.has(appt.id)}
                          onCheckedChange={() => toggleSelect(appt.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{appt.customer?.name}</span>
                              {isSoon(appt.startTime) && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  Soon
                                </span>
                              )}
                            </div>
                            <Badge variant="outline">{appt.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with {appt.staff?.user?.name || "Any Stylist"}
                          </p>
                          <p className="text-xs font-semibold mt-1">{appt.services?.map((s: any) => s.name).join(", ")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          {selectedAppt && <AppointmentPanel appointment={selectedAppt} onRefresh={refetch} />}
        </Sheet>

        <BookingModal open={isBookingOpen} onOpenChange={setIsBookingOpen} branches={branches} staffList={staffList} services={services} onSuccess={refetch} />
        <WalkinModal open={isWalkinOpen} onOpenChange={setIsWalkinOpen} branches={branches} staffList={staffList} services={services} onSuccess={refetch} />
        <WaitlistModal open={isWaitlistOpen} onOpenChange={setIsWaitlistOpen} branches={branches} services={services} onSuccess={refetch} />
      </div>
    </>
  );
}
