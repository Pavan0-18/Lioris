"use client";
import { create } from "zustand";
import {
  addToOfflineQueue,
  syncOfflineQueue,
  getOfflineQueue,
  type QueueItem,
} from "@/lib/offline-storage";

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  setOnline: (online: boolean) => void;
  enqueue: (type: QueueItem["type"], endpoint: string, method: string, payload: any) => QueueItem;
  sync: () => Promise<{ syncedCount: number; remainingCount: number }>;
  refresh: () => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,

  setOnline: (online) => set({ isOnline: online }),

  enqueue: (type, endpoint, method, payload) => {
    const item = addToOfflineQueue(type, endpoint, method, payload);
    get().refresh();
    return item;
  },

  sync: async () => {
    if (get().isSyncing) return { syncedCount: 0, remainingCount: get().pendingCount };
    set({ isSyncing: true });
    try {
      const result = await syncOfflineQueue();
      set({
        pendingCount: result.remainingCount,
        isSyncing: false,
        lastSyncAt: new Date(),
      });
      return result;
    } catch (err) {
      set({ isSyncing: false });
      return { syncedCount: 0, remainingCount: get().pendingCount };
    }
  },

  refresh: () => set({ pendingCount: getOfflineQueue().length }),
}));