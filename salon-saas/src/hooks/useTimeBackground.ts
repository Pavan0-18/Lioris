"use client";
import React from "react";

export type TimeOfDay = "morning" | "evening" | "night";

export interface TimeBackgroundColors {
  gradient: string;
  solid: string;
}

const timeSchemes: Record<TimeOfDay, TimeBackgroundColors> = {
  morning: {
    gradient: "linear-gradient(135deg, #FFF8F0 0%, #FFEAD5 30%, #FFD6A5 70%, #FFE4CC 100%)",
    solid: "#FFF5EB",
  },
  evening: {
    gradient: "linear-gradient(135deg, #FFEDE0 0%, #FFD6B0 25%, #FEC89A 55%, #FFE0C0 100%)",
    solid: "#FFE8D6",
  },
  night: {
    gradient: "linear-gradient(135deg, #0F0A1A 0%, #1A162E 30%, #16213E 60%, #0D1B2A 100%)",
    solid: "#0A0610",
  },
};

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "evening";
  return "night";
}

export function useTimeOfDay(): TimeOfDay {
  const [time, setTime] = React.useState<TimeOfDay>(getTimeOfDay);

  React.useEffect(() => {
    const tick = () => setTime(getTimeOfDay());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return time;
}

export function useTimeBackground(): TimeBackgroundColors {
  const time = useTimeOfDay();
  return timeSchemes[time];
}
