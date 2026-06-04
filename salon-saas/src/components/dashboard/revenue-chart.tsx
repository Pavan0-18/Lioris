"use client";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface RevenueChartProps {
  data: { date: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
        No revenue data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-bold">{formatCurrency(total)}</span>
        <span className="text-xs text-muted-foreground">last 30 days</span>
      </div>
      <div className="w-full" style={{ height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(v: string) => format(new Date(v), "MMM dd")}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) => formatCurrency(v).replace(/\.\d+/, "")}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
