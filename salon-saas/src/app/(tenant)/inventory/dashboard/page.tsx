"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { format } from "date-fns";
import {
  Package, PackageCheck, AlertTriangle, TrendingUp, ShoppingCart,
  Truck, DollarSign, RefreshCw, BarChart3, Plus, Trash2, Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardData {
  kpi: {
    totalProducts: number; totalInventoryValue: number; availableStockQuantity: number;
    lowStockItems: number; productsUsedThisMonth: number; wastageThisMonth: number;
    totalVendors: number; purchasesThisMonth: number; purchasesAmountThisMonth: number;
  };
  charts: {
    inventoryValueTrend: { date: string; value: number }[];
    stockLevelTrend: { date: string; stock: number }[];
    usageTrend: { date: string; value: number }[];
    wastageTrend: { date: string; value: number }[];
    monthlyPurchaseTrend: { month: string; amount: number; count: number }[];
    topUsedProducts: { name: string; totalUsed: number }[];
    topLowStockProducts: { name: string; sku: string; stock: number; reorderLevel: number }[];
  };
  recentActivity: {
    recentPurchases: any[]; recentGoodsReceipts: any[];
    recentProductUsage: any[]; recentWastage: any[];
  };
  summary: {
    lowStockSummary: { name: string; sku: string; stock: number; reorderLevel: number; value: number }[];
    inventoryValuationSummary: { categoryName: string; totalProducts: number; totalStock: number; totalValue: number }[];
    monthlyUsageSummary: { total: number };
    monthlyWastageSummary: { total: number };
    monthlyProcurementSummary: { count: number; amount: number };
  };
}

function KpiCard({ title, value, icon, subtitle, color }: {
  title: string; value: string | number; icon: React.ReactNode;
  subtitle?: string; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartEmpty({ height = 200 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <p className="text-xs text-muted-foreground">No data available</p>
    </div>
  );
}

export default function InventoryDashboardPage() {
  const [categoryId, setCategoryId] = React.useState("");
  const [vendorId, setVendorId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const queryParams = new URLSearchParams();
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (vendorId) queryParams.set("vendorId", vendorId);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data: raw, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory-dashboard", categoryId, vendorId, startDate, endDate],
    queryFn: () => fetch(`/api/tenant/inventory/dashboard?${queryParams.toString()}`).then((r) => r.json()),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const d: DashboardData | undefined = raw?.data;

  const { data: catData } = useQuery({
    queryKey: ["dashboard-categories"],
    queryFn: () => fetch("/api/tenant/inventory/products/categories").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const { data: venData } = useQuery({
    queryKey: ["dashboard-vendors"],
    queryFn: () => fetch("/api/tenant/vendors?all=true").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const categories = catData?.data || [];
  const vendors = venData?.data || [];

  const formatValue = (v: number) => {
    if (v >= 100000) return (v / 100000).toFixed(1) + "L";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return v.toLocaleString();
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const clearFilters = () => { setCategoryId(""); setVendorId(""); setStartDate(""); setEndDate(""); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-lg font-semibold">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{(error as any)?.message || "An unexpected error occurred. Check the console for details."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h2>
            <p className="text-sm text-muted-foreground">High-level overview of inventory performance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm h-9">
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}
              className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm h-9">
              <option value="">All Vendors</option>
              {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-36 text-sm" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-36 text-sm" />
            {(categoryId || vendorId || startDate || endDate) && (
              <button onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap">Clear</button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href="/inventory/products"><Plus className="h-3.5 w-3.5 mr-1" /> Add Product</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/procurement/vendors"><Truck className="h-3.5 w-3.5 mr-1" /> Add Vendor</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/procurement/purchases"><ShoppingCart className="h-3.5 w-3.5 mr-1" /> Create Purchase</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/procurement/goods-receipt"><PackageCheck className="h-3.5 w-3.5 mr-1" /> Goods Receipt</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/inventory/wastage"><Trash2 className="h-3.5 w-3.5 mr-1" /> Record Wastage</Link>
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="Total Products" value={d?.kpi.totalProducts ?? 0} icon={<Package className="h-4 w-4" />} color="text-blue-600" />
            <KpiCard title="Inventory Value" value={formatCurrency(d?.kpi.totalInventoryValue ?? 0)} icon={<DollarSign className="h-4 w-4" />} color="text-green-600" subtitle={`${formatValue(d?.kpi.availableStockQuantity ?? 0)} units in stock`} />
            <KpiCard title="Low Stock Items" value={d?.kpi.lowStockItems ?? 0} icon={<AlertTriangle className="h-4 w-4" />} color="text-orange-600" />
            <KpiCard title="Products Used" value={formatValue(d?.kpi.productsUsedThisMonth ?? 0)} icon={<BarChart3 className="h-4 w-4" />} color="text-purple-600" subtitle="This month" />
            <KpiCard title="Wastage" value={formatValue(d?.kpi.wastageThisMonth ?? 0)} icon={<Trash2 className="h-4 w-4" />} color="text-red-600" subtitle="This month" />
            <KpiCard title="Total Vendors" value={d?.kpi.totalVendors ?? 0} icon={<Truck className="h-4 w-4" />} color="text-indigo-600" />
            <KpiCard title="Purchases" value={d?.kpi.purchasesThisMonth ?? 0} icon={<ShoppingCart className="h-4 w-4" />} color="text-teal-600" subtitle={`${formatCurrency(d?.kpi.purchasesAmountThisMonth ?? 0)} this month`} />
            <KpiCard title="Stock Quantity" value={formatValue(d?.kpi.availableStockQuantity ?? 0)} icon={<PackageCheck className="h-4 w-4" />} color="text-cyan-600" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Analytics &amp; Charts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ChartCard title="Inventory Value Trend" subtitle="Last 6 months">
              {d?.charts.inventoryValueTrend?.length ? (
                <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.charts.inventoryValueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>

            <ChartCard title="Monthly Purchase Trend" subtitle="Last 6 months">
              {d?.charts.monthlyPurchaseTrend?.length ? (
                <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.charts.monthlyPurchaseTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>

            <ChartCard title="Product Usage Trend" subtitle="Last 30 days">
              {d?.charts.usageTrend?.length ? (
                <div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.charts.usageTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => format(new Date(v), "dd")} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} labelFormatter={(v: string) => format(new Date(v), "MMM dd")} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>

            <ChartCard title="Wastage Trend" subtitle="Last 30 days">
              {d?.charts.wastageTrend?.length ? (
                <div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.charts.wastageTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => format(new Date(v), "dd")} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} labelFormatter={(v: string) => format(new Date(v), "MMM dd")} />
                    <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>

            <ChartCard title="Stock Level Trend" subtitle="Last 6 months">
              {d?.charts.stockLevelTrend?.length ? (
                <div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.charts.stockLevelTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="stock" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>

            <ChartCard title="Top 10 Low Stock Products">
              {d?.charts.topLowStockProducts?.length ? (
                <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.charts.topLowStockProducts} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="stock" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>

            <ChartCard title="Top 10 Most Used Products">
              {d?.charts.topUsedProducts?.length ? (
                <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.charts.topUsedProducts} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="totalUsed" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer></div>
              ) : <ChartEmpty />}
            </ChartCard>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Reports &amp; Summary</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Low Stock Summary">
              {d?.summary.lowStockSummary?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-2 font-medium">Product</th>
                        <th className="text-right py-2 font-medium">SKU</th>
                        <th className="text-right py-2 font-medium">Stock</th>
                        <th className="text-right py-2 font-medium">Reorder Level</th>
                        <th className="text-right py-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.summary.lowStockSummary.slice(0, 8).map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-1.5 font-medium">{item.name}</td>
                          <td className="py-1.5 text-right text-muted-foreground">{item.sku}</td>
                          <td className="py-1.5 text-right text-orange-600 font-medium">{item.stock}</td>
                          <td className="py-1.5 text-right">{item.reorderLevel}</td>
                          <td className="py-1.5 text-right">{formatCurrency(item.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                  <PackageCheck className="h-4 w-4 mr-1 text-green-500" /> All products are adequately stocked
                </div>
              )}
            </ChartCard>

            <ChartCard title="Inventory Valuation by Category">
              {d?.summary.inventoryValuationSummary?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-right py-2 font-medium">Products</th>
                        <th className="text-right py-2 font-medium">Stock</th>
                        <th className="text-right py-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.summary.inventoryValuationSummary.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-1.5 font-medium">{item.categoryName}</td>
                          <td className="py-1.5 text-right">{item.totalProducts}</td>
                          <td className="py-1.5 text-right">{item.totalStock}</td>
                          <td className="py-1.5 text-right font-medium">{formatCurrency(item.totalValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <ChartEmpty height={80} />}
            </ChartCard>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Recent Activity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Recent Purchases
                </div>
                {d?.recentActivity.recentPurchases?.length ? (
                  <div className="space-y-1.5">
                    {d.recentActivity.recentPurchases.slice(0, 4).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[120px]">{p.vendorName}</span>
                        <span className="text-muted-foreground">{formatCurrency(p.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-muted-foreground">No recent purchases</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <PackageCheck className="h-3.5 w-3.5 text-primary" /> Recent Receipts
                </div>
                {d?.recentActivity.recentGoodsReceipts?.length ? (
                  <div className="space-y-1.5">
                    {d.recentActivity.recentGoodsReceipts.slice(0, 4).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[120px]">{p.vendorName}</span>
                        <span className="text-muted-foreground">{formatCurrency(p.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-muted-foreground">No recent receipts</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" /> Recent Usage
                </div>
                {d?.recentActivity.recentProductUsage?.length ? (
                  <div className="space-y-1.5">
                    {d.recentActivity.recentProductUsage.slice(0, 4).map((u: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[120px]">{u.productName}</span>
                        <span className="text-muted-foreground">{u.quantity} units</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-muted-foreground">No recent usage</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Trash2 className="h-3.5 w-3.5 text-primary" /> Recent Wastage
                </div>
                {d?.recentActivity.recentWastage?.length ? (
                  <div className="space-y-1.5">
                    {d.recentActivity.recentWastage.slice(0, 4).map((w: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[120px]">{w.productName}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{w.reason}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-muted-foreground">No wastage records</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Monthly Summaries</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Monthly Usage Summary</p>
                <p className="text-xl font-bold">{formatValue(d?.summary.monthlyUsageSummary?.total ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground">units consumed this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Monthly Wastage Summary</p>
                <p className="text-xl font-bold">{formatValue(d?.summary.monthlyWastageSummary?.total ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground">units wasted this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Monthly Procurement Summary</p>
                <p className="text-xl font-bold">{d?.summary.monthlyProcurementSummary?.count ?? 0} orders</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(d?.summary.monthlyProcurementSummary?.amount ?? 0)} this month
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
