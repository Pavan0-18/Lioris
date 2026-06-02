"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { BoneyardPage, BoneyardTable, BoneyardChart } from "@/components/ui/boneyard";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { subDays, format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const periods = ["today", "week", "month", "custom"] as const;
const chartPeriods = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

export default function ReportsDashboardPage() {
  const [period, setPeriod] = useState<string>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [chartRange, setChartRange] = useState<number>(30);

  const summaryParams = new URLSearchParams({ period });
  if (period === "custom" && customStart && customEnd) {
    summaryParams.set("startDate", customStart);
    summaryParams.set("endDate", customEnd);
  }

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["reports-summary", period, customStart, customEnd],
    queryFn: () => fetch(`/api/tenant/billing/summary?${summaryParams}`).then(r => r.json()),
    staleTime: 2 * 60 * 1000,
  });
  const summary = summaryData?.data;

  const now = new Date();
  const chartStart = format(subDays(now, chartRange), "yyyy-MM-dd");
  const chartEnd = format(now, "yyyy-MM-dd");

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["analytics-revenue", chartStart, chartEnd],
    queryFn: () => fetch(`/api/tenant/analytics/revenue?startDate=${chartStart}&endDate=${chartEnd}&groupBy=day`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const revenue = revenueData?.data;

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["analytics-staff", chartStart, chartEnd],
    queryFn: () => fetch(`/api/tenant/analytics/staff-performance?startDate=${chartStart}&endDate=${chartEnd}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: peakData, isLoading: peakLoading } = useQuery({
    queryKey: ["analytics-peak", chartStart, chartEnd],
    queryFn: () => fetch(`/api/tenant/analytics/peak-hours?startDate=${chartStart}&endDate=${chartEnd}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["analytics-customers", chartStart, chartEnd],
    queryFn: () => fetch(`/api/tenant/analytics/customers?startDate=${chartStart}&endDate=${chartEnd}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const byMethod = summary?.revenue?.byMethod || {};
  const methodEntries = Object.entries(byMethod);
  const maxMethodValue = Math.max(...methodEntries.map(([, v]) => v as number), 1);

  const heatmap = peakData?.data?.heatmap || [];
  const maxCount = Math.max(...heatmap.map((h: any) => h.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-sm text-muted-foreground">Track revenue, services, and business performance</p>
      </div>

      {/* Section 1 — Basic Reports */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          {periods.map(p => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "Custom"}
            </Button>
          ))}
          {period === "custom" && (
            <div className="flex gap-2 items-center">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8" />
              </div>
            </div>
          )}
        </div>

        {summaryLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 h-20" /></Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary?.revenue?.total || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Invoices</p>
                <p className="text-xl font-bold mt-1">{summary?.invoices?.count || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Invoice Value</p>
                <p className="text-xl font-bold mt-1">{summary?.invoices?.averageValue ? formatCurrency(summary.invoices.averageValue) : formatCurrency(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Appointments Completed</p>
                <p className="text-xl font-bold mt-1">{summary?.appointments?.completed || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summaryLoading ? (
                <BoneyardChart />
              ) : methodEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment data for this period</p>
              ) : (
                methodEntries.map(([method, total]) => (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{method}</span>
                      <span className="font-medium">{formatCurrency(total as number)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full"
                        style={{ width: `${((total as number) / maxMethodValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 Services</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <BoneyardTable rows={5} cols={2} />
              ) : !summary?.topServices || summary.topServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not enough data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topServices.map((s: any) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 2 — Advanced Analytics */}
      <FeatureGate feature="ANALYTICS_ADV">
        <section className="space-y-6">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Advanced Analytics</h3>
            <p className="text-sm text-muted-foreground">Deep dive into revenue trends, staff performance, and customer behavior</p>
          </div>

          {/* 2a. Revenue Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <div className="flex gap-1">
                {chartPeriods.map(cp => (
                  <Button
                    key={cp.label}
                    variant={chartRange === cp.days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartRange(cp.days)}
                  >
                    {cp.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <BoneyardChart />
                </div>
              ) : revenue?.series?.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl font-bold">{formatCurrency(revenue.total)}</span>
                    {revenue.changePercent !== 0 && (
                      <Badge
                        className={revenue.changeDirection === "up" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}
                      >
                        {revenue.changeDirection === "up" ? "+" : ""}{revenue.changePercent}% vs previous period
                      </Badge>
                    )}
                  </div>
                  <div className="w-full" style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenue.series} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => format(new Date(v), "MMM dd")} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v).replace(/\.\d+/, "")} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No revenue data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2b. Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
                <BoneyardTable rows={5} cols={3} />
              ) : !staffData?.data?.staff || staffData.data.staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Appointments</TableHead>
                      <TableHead>Top Service</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffData.data.staff.map((s: any) => (
                      <TableRow key={s.staffId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.appointmentsCompleted}</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 2c. Peak Hours Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peak Hours</CardTitle>
            </CardHeader>
            <CardContent>
              {peakLoading ? (
                <BoneyardChart />
              ) : heatmap.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointment data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[auto_repeat(12,minmax(48px,1fr))] gap-1 min-w-[640px]">
                    <div />
                    {HOURS.map(h => (
                      <div key={h} className="text-xs text-muted-foreground text-center font-medium">{h}</div>
                    ))}
                    {DAYS.map((day, dayIdx) => {
                      const dow = dayIdx + 1;
                      return (
                        <React.Fragment key={day}>
                          <div className="text-xs text-muted-foreground font-medium flex items-center pr-2">{day}</div>
                          {HOURS.map((_, hourIdx) => {
                            const hour = hourIdx + 9;
                            const cell = heatmap.find((h: any) => h.dayOfWeek === dow && h.hour === hour);
                            const count = cell?.count || 0;
                            const intensity = count / maxCount;
                            return (
                              <div
                                key={`${dow}-${hour}`}
                                className="rounded-md aspect-square flex items-center justify-center text-xs font-medium transition-colors"
                                style={{
                                  backgroundColor: count > 0
                                    ? `hsla(var(--primary), ${0.1 + intensity * 0.6})`
                                    : "hsl(var(--muted))",
                                  color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : undefined,
                                }}
                                title={`${DAYS[dayIdx]} ${hour}:00 — ${count} bookings`}
                              >
                                {count > 0 ? count : ""}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2d. Customer Insights */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold">Customer Insights</h4>
            {customerLoading ? (
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4 h-20" /></Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">New Customers</p>
                      <p className="text-xl font-bold mt-1">{customerData?.data?.newCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Returning Customers</p>
                      <p className="text-xl font-bold mt-1">{customerData?.data?.returningCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Retention Rate</p>
                      <p className="text-xl font-bold mt-1">{customerData?.data?.retentionRate?.toFixed(1) || "0"}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Avg Visit Frequency</p>
                      <p className="text-xl font-bold mt-1">{customerData?.data?.averageVisitFrequency?.toFixed(1) || "0"}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top 5 Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!customerData?.data?.topCustomers || customerData.data.topCustomers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No customer data available</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Visits</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.data.topCustomers.map((c: any) => (
                            <TableRow key={c.name}>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="text-right">{c.visits}</TableCell>
                              <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </section>
        </section>
      </FeatureGate>
    </div>
  );
}
