"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppointmentPanel } from "./appointment-panel";
import { BookingModal } from "./booking-modal";
import { WalkinModal } from "./walkin-modal";
import { BoneyardPage } from "@/components/ui/boneyard";
import { useDebounce } from "@/hooks/useDebounce";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { toast } from "sonner";
import { Clock, User, Tag, Plus, UserCheck, Search, X, LayoutGrid, Columns3, GripVertical, Timer, RepeatIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WaitlistModal } from "./waitlist-modal";

const STATUS_CONFIG: Record<string, { label: string; color: string; cardBg: string }> = {
  scheduled:    { label: "Scheduled",    color: "#3b82f6", cardBg: "bg-blue-50 dark:bg-blue-950/30" },
  confirmed:    { label: "Confirmed",    color: "#14b8a6", cardBg: "bg-teal-50 dark:bg-teal-950/30" },
  in_progress:  { label: "In Progress",  color: "#f59e0b", cardBg: "bg-amber-50 dark:bg-amber-950/30" },
  completed:    { label: "Completed",    color: "#10b981", cardBg: "bg-green-50 dark:bg-green-950/30" },
  cancelled:    { label: "Cancelled",    color: "#ef4444", cardBg: "bg-red-50 dark:bg-red-950/30" },
  no_show:      { label: "No Show",      color: "#8b5cf6", cardBg: "bg-purple-50 dark:bg-purple-950/30" },
};

const STATUS_ORDER = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

type BoardMode = "status" | "staff";

export function AppointmentKanban() {
  const queryClient = useQueryClient();
  const [selectedAppt, setSelectedAppt] = React.useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);
  const [isWalkinOpen, setIsWalkinOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [collapsedColumns, setCollapsedColumns] = React.useState<Set<string>>(new Set(["completed", "cancelled", "no_show"]));
  const [boardMode, setBoardMode] = React.useState<BoardMode>("status");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = React.useState("");
  const [isWaitlistOpen, setIsWaitlistOpen] = React.useState(false);

  useRealtimeAppointments();

  const debouncedSearch = useDebounce(search, 300);

  const { data: batchData, isLoading, refetch } = useQuery({
    queryKey: ["appointments-batch"],
    queryFn: async () => {
      const response = await fetch("/api/tenant/batch?resources=branches,staff,services,appointments", {
        method: "GET",
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tenant/appointments/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-batch"] });
      refetch();
      toast.success("Appointment moved!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to move appointment.");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, startTime, staffId }: { id: string; startTime?: string; staffId?: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["appointments-batch"] });
      refetch();
      toast.success("Appointment updated!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update appointment.");
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
      queryClient.invalidateQueries({ queryKey: ["appointments-batch"] });
      refetch();
      setSelectedIds(new Set());
      setBulkStatus("");
      toast.success("Appointments updated!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update appointments.");
    },
  });

  const batchAppts = batchData?.data?.appointments;
  const branches = batchData?.data?.branches || [];
  const staffList = batchData?.data?.staff || [];
  const services = batchData?.data?.services || [];

  const filteredAppts = React.useMemo(() => {
    const raw = batchAppts || [];
    if (!debouncedSearch) return raw;
    const q = debouncedSearch.toLowerCase();
    return raw.filter((a: any) => {
      const name = a.customer?.name?.toLowerCase() || "";
      const serviceNames = a.services?.map((s: any) => s.name?.toLowerCase()).join(" ") || "";
      return name.includes(q) || serviceNames.includes(q);
    });
  }, [batchAppts, debouncedSearch]);

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

  const toggleCollapse = (columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const isSoon = (startTime: string) => {
    const diff = new Date(startTime).getTime() - Date.now();
    return diff > 0 && diff <= 30 * 60 * 1000;
  };

  const statusColumns = STATUS_ORDER.map((status) => ({
    id: status,
    title: STATUS_CONFIG[status]?.label || status,
    items: filteredAppts.filter((a: any) => a.status === status),
    color: STATUS_CONFIG[status]?.color,
  }));

  const unassigned = filteredAppts.filter((a: any) => !a.staffId);
  const staffColumns = [
    ...staffList.map((s: any) => ({
      id: s.id,
      title: s.user?.name || "Staff",
      items: filteredAppts.filter((a: any) => a.staffId === s.id),
      color: "#8b5cf6",
    })),
    ...(unassigned.length > 0 ? [{
      id: "__unassigned",
      title: "Unassigned",
      items: unassigned,
      color: "#6b7280",
    }] : []),
  ];

  if (isLoading) {
    return <BoneyardPage />;
  }

  return (
    <>
      <style>{`
        @keyframes soon-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(251, 191, 36, 0.3), 0 0 8px rgba(251, 191, 36, 0.1); }
          50% { box-shadow: 0 0 8px rgba(251, 191, 36, 0.6), 0 0 16px rgba(251, 191, 36, 0.2); }
        }
        .kanban-card-soon {
          animation: soon-glow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-4">
        <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={() => setIsBookingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Book Appointment
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsWalkinOpen(true)}>
              <UserCheck className="h-4 w-4 mr-2" /> Quick Walk-In
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsWaitlistOpen(true)}>
              <Timer className="h-4 w-4 mr-2" /> Waitlist
            </Button>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
            <Button
              size="sm"
              variant={boardMode === "status" ? "default" : "ghost"}
              onClick={() => setBoardMode("status")}
              className="gap-1 h-7 text-xs"
            >
              <Columns3 className="h-3.5 w-3.5" />
              Status
            </Button>
            <Button
              size="sm"
              variant={boardMode === "staff" ? "default" : "ghost"}
              onClick={() => setBoardMode("staff")}
              className="gap-1 h-7 text-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Staff
            </Button>
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
            <Button size="sm" disabled={!bulkStatus} onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: bulkStatus })}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkStatus(""); }}>
              Clear
            </Button>
          </div>
        )}

        {boardMode === "status" ? (
          <KanbanBoard
            columns={statusColumns}
            onColumnDrop={(itemId, _, toColumn) => {
              statusMutation.mutate({ id: itemId, status: toColumn });
            }}
            collapsibleColumnIds={["completed", "cancelled", "no_show"]}
            collapsedColumns={collapsedColumns}
            onToggleCollapse={toggleCollapse}
            renderCard={(appt: any) => {
              const cfg = STATUS_CONFIG[appt.status];
              const soon = isSoon(appt.startTime);
              return (
                <div
                  onClick={() => handleCardClick(appt)}
                  className={`${cfg?.cardBg || "bg-card"} rounded-lg border border-border/50 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-150 hover:-translate-y-0.5 ${soon ? "kanban-card-soon ring-2 ring-amber-400/50" : ""}`}
                >
                  <div className="h-1.5 rounded-t-lg" style={{ backgroundColor: cfg?.color || "#6b7280" }} />
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={selectedIds.has(appt.id)}
                          onCheckedChange={() => toggleSelect(appt.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <span className="font-semibold text-sm leading-tight text-foreground truncate">{appt.customer?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {appt.recurrenceRule && <RepeatIcon className="h-3 w-3 text-primary" />}
                        {soon && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Soon
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>
                        {new Date(appt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {appt.staff?.user?.name && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{appt.staff.user.name}</span>
                        </>
                      )}
                    </div>

                    {appt.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {appt.services.slice(0, 3).map((s: any) => (
                          <span
                            key={s.serviceId ?? s.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/80 text-muted-foreground border border-border/50"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {s.name}
                          </span>
                        ))}
                        {appt.services.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/60">+{appt.services.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {appt.branch?.name && (
                      <p className="text-[10px] text-muted-foreground/50">{appt.branch.name}</p>
                    )}
                  </div>
                </div>
              );
            }}
            emptyState={
              <div className="py-20 text-center text-sm text-muted-foreground">
                <p className="font-medium">No appointments yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Book one using the buttons above.</p>
              </div>
            }
          />
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {staffColumns.map((column) => {
                const sorted = [...column.items].sort(
                  (a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );
                return (
                  <div
                    key={column.id}
                    className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-border bg-card/50 backdrop-blur-sm"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                        rescheduleMutation.mutate({ id: data.apptId, staffId: column.id === "__unassigned" ? undefined : column.id });
                      } catch {}
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border border-l-[3px]" style={{ borderLeftColor: column.color || "#6b7280" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color || "#6b7280" }} />
                        <h3 className="text-sm font-semibold text-foreground truncate">{column.title}</h3>
                      </div>
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold rounded-full bg-muted text-muted-foreground">
                        {sorted.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)]">
                      {sorted.length === 0 ? (
                        <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50 italic">
                          Drop items here
                        </div>
                      ) : (
                        HOURS.map((hour) => {
                          const hourAppts = sorted.filter((a: any) => new Date(a.startTime).getHours() === hour);
                          if (hourAppts.length === 0) return null;
                          return (
                            <div key={hour}>
                              <p className="text-[10px] font-medium text-muted-foreground/50 mb-1 uppercase tracking-wider">
                                {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                              </p>
                              {hourAppts.map((appt: any) => (
                                <div
                                  key={appt.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", JSON.stringify({ apptId: appt.id }));
                                  }}
                                  onClick={() => handleCardClick(appt)}
                                  className="flex items-center gap-2 p-2.5 mb-1 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 cursor-grab active:cursor-grabbing transition-colors"
                                >
                                  <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                      {appt.customer?.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {new Date(appt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      {appt.services?.[0] && ` - ${appt.services[0].name}`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}
                      {sorted.length > 0 && HOURS.filter((h) => !sorted.some((a: any) => new Date(a.startTime).getHours() === h)).length === HOURS.length && (
                        <div className="text-[10px] text-muted-foreground/30 italic text-center py-4">
                          All day
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {selectedAppt && (
          <AppointmentPanel appointment={selectedAppt} onRefresh={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["appointments-batch"] }); }} />
        )}
      </Sheet>

      <BookingModal
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        branches={branches}
        staffList={staffList}
        services={services}
        onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["appointments-batch"] }); }}
      />

      <WalkinModal
        open={isWalkinOpen}
        onOpenChange={setIsWalkinOpen}
        branches={branches}
        staffList={staffList}
        services={services}
        onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["appointments-batch"] }); }}
      />

      <WaitlistModal
        open={isWaitlistOpen}
        onOpenChange={setIsWaitlistOpen}
        branches={branches}
        services={services}
        onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["appointments-batch"] }); }}
      />
    </>
  );
}
