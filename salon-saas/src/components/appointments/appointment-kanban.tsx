"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { Sheet } from "@/components/ui/sheet";
import { AppointmentPanel } from "./appointment-panel";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Clock, User, Tag } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; cardBg: string }> = {
  scheduled:    { label: "Scheduled",    color: "#3b82f6", cardBg: "bg-blue-50 dark:bg-blue-950/30" },
  confirmed:    { label: "Confirmed",    color: "#14b8a6", cardBg: "bg-teal-50 dark:bg-teal-950/30" },
  in_progress:  { label: "In Progress",  color: "#f59e0b", cardBg: "bg-amber-50 dark:bg-amber-950/30" },
  completed:    { label: "Completed",    color: "#10b981", cardBg: "bg-green-50 dark:bg-green-950/30" },
  cancelled:    { label: "Cancelled",    color: "#ef4444", cardBg: "bg-red-50 dark:bg-red-950/30" },
  no_show:      { label: "No Show",      color: "#8b5cf6", cardBg: "bg-purple-50 dark:bg-purple-950/30" },
};

const STATUS_ORDER = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

export function AppointmentKanban() {
  const queryClient = useQueryClient();
  const [selectedAppt, setSelectedAppt] = React.useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const { data: batchData, isLoading, refetch } = useQuery({
    queryKey: ["appointments-batch"],
    queryFn: async () => {
      const response = await fetch("/api/tenant/batch?resources=branches,staff,services,appointments", {
        method: "GET",
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
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

  const appts = batchData?.data?.appointments || [];

  const columns = STATUS_ORDER.map((status) => ({
    id: status,
    title: STATUS_CONFIG[status]?.label || status,
    items: appts.filter((a: any) => a.status === status),
    color: STATUS_CONFIG[status]?.color,
  }));

  const handleCardClick = (appt: any) => {
    setSelectedAppt(appt);
    setIsSheetOpen(true);
  };

  if (isLoading) {
    return <BoneyardPage />;
  }

  return (
    <>
      <KanbanBoard
        columns={columns}
        onColumnDrop={(itemId, _, toColumn) => {
          statusMutation.mutate({ id: itemId, status: toColumn });
        }}
        renderCard={(appt: any) => {
          const cfg = STATUS_CONFIG[appt.status];
          return (
            <div
              onClick={() => handleCardClick(appt)}
              className={`${cfg?.cardBg || "bg-card"} rounded-lg border border-border/50 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-150 hover:-translate-y-0.5`}
            >
              <div className="h-1.5 rounded-t-lg" style={{ backgroundColor: cfg?.color || "#6b7280" }} />
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm leading-tight text-foreground">{appt.customer?.name}</span>
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
            <p className="text-xs text-muted-foreground/60 mt-1">Switch to Calendar view to book one.</p>
          </div>
        }
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {selectedAppt && (
          <AppointmentPanel appointment={selectedAppt} onRefresh={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["appointments-batch"] }); }} />
        )}
      </Sheet>
    </>
  );
}
