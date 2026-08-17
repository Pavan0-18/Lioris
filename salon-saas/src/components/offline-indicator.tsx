"use client";
import React from "react";
import { useOfflineStore } from "@/store/offline-store";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const isSyncing = useOfflineStore((s) => s.isSyncing);
  const setOnline = useOfflineStore((s) => s.setOnline);
  const sync = useOfflineStore((s) => s.sync);
  const refresh = useOfflineStore((s) => s.refresh);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    refresh();

    const handleOnline = async () => {
      setOnline(true);
      toast.success("Internet connection restored!");
      const { syncedCount } = await sync();
      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} offline transactions.`);
      }
    };

    const handleOffline = () => {
      setOnline(false);
      toast.warning("Internet disconnected. New bookings will be queued and synced when back online.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline, sync, refresh]);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur border border-border shadow-lg rounded-full px-4 py-2 text-xs font-medium">
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-amber-600 dark:text-amber-400">Offline Mode</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>Online</span>
        </>
      )}

      {pendingCount > 0 && (
        <button
          onClick={() => sync()}
          className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold hover:bg-primary/20 transition-colors"
          title="Click to sync now"
        >
          {pendingCount} queued
        </button>
      )}

      {isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary ml-1" />}
    </div>
  );
}