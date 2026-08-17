// Offline Queue Helper using LocalStorage/IndexedDB fallback
export interface QueueItem {
  id: string;
  type: "appointment" | "walkin" | "billing";
  endpoint: string;
  method: string;
  payload: any;
  createdAt: string;
}

const OFFLINE_QUEUE_KEY = "lioris_offline_queue";

export function getOfflineQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(type: QueueItem["type"], endpoint: string, method: string, payload: any): QueueItem {
  const queue = getOfflineQueue();
  const newItem: QueueItem = {
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    endpoint,
    method,
    payload,
    createdAt: new Date().toISOString(),
  };
  queue.push(newItem);
  if (typeof window !== "undefined") {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }
  return newItem;
}

export async function syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

  const remaining: QueueItem[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        syncedCount++;
      } else {
        remaining.push(item);
      }
    } catch (err) {
      remaining.push(item);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }

  return { syncedCount, remainingCount: remaining.length };
}
