"use client";
import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface UpcomingAppointment {
  id: string;
  customerName: string;
  staffName: string;
  startTime: string;
  status: string;
  services: { name: string }[];
}

interface UpcomingAppointmentsProps {
  appointments: UpcomingAppointment[];
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function getTimeRemaining(target: Date) {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "Now";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Upcoming
        </CardTitle>
        <span className="text-xs text-muted-foreground">{appointments.length} upcoming</span>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground/60">
            No upcoming appointments.
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.slice(0, 5).map((appt) => {
              const start = new Date(appt.startTime);
              const servicesText = appt.services?.map((s) => s.name).join(", ") || "";
              return (
                <Link
                  key={appt.id}
                  href="/appointments"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors no-underline"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{appt.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {appt.staffName}
                      {servicesText ? ` · ${servicesText}` : ""}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold text-primary">{getTimeRemaining(start)}</p>
                    <p className="text-xs text-muted-foreground">
                      {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </Link>
              );
            })}
            {appointments.length > 5 && (
              <Link
                href="/appointments"
                className="block text-center text-xs text-primary hover:underline pt-1"
              >
                View all {appointments.length} upcoming
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
