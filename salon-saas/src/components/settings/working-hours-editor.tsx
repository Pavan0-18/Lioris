"use client";
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export interface WorkingHourRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface WorkingHoursEditorProps {
  value: WorkingHourRow[];
  onChange: (rows: WorkingHourRow[]) => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const handleRowChange = (dayIndex: number, field: keyof WorkingHourRow, val: any) => {
    const updated = value.map(row => {
      if (row.dayOfWeek === dayIndex) {
        return { ...row, [field]: val };
      }
      return row;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Weekly Working Hours</h3>
      <div className="divide-y divide-border">
        {DAYS.map((day, idx) => {
          const row = value.find(r => r.dayOfWeek === idx) || {
            dayOfWeek: idx,
            openTime: "09:00",
            closeTime: "18:00",
            isClosed: false
          };

          return (
            <div key={day} className="flex items-center justify-between py-3 gap-4">
              <span className="w-24 text-sm font-medium">{day}</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Closed</span>
                  <Switch
                    checked={row.isClosed}
                    onCheckedChange={(checked) => handleRowChange(idx, "isClosed", checked)}
                  />
                </div>
                <Input
                  type="time"
                  disabled={row.isClosed}
                  value={row.openTime}
                  onChange={(e) => handleRowChange(idx, "openTime", e.target.value)}
                  className="w-28 h-8"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  disabled={row.isClosed}
                  value={row.closeTime}
                  onChange={(e) => handleRowChange(idx, "closeTime", e.target.value)}
                  className="w-28 h-8"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
