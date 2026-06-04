"use client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeAppointments() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      eventSource = new EventSource("/api/tenant/appointments/events");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action) {
            queryClient.invalidateQueries({ queryKey: ["appointments-batch"] });
            queryClient.invalidateQueries({ queryKey: ["appointments-today-count"] });
          }
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);
}
