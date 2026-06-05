"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BoneyardCard } from "@/components/ui/boneyard";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download } from "lucide-react";

type ReportTab = "summary" | "valuation" | "movement" | "usage" | "wastage";

export default function InventoryReportsPage() {
  const [activeReport, setActiveReport] = React.useState<ReportTab>("summary");
  const [days, setDays] = React.useState(30);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["inventory-reports", activeReport, days],
    queryFn: () =>
      fetch(`/api/tenant/inventory/reports?report=${activeReport}&days=${days}`).then((r) => r.json()),
  });

  const reportData = summaryData?.data;
  const report = reportData?.data || reportData;

  const exportReport = () => {
    if (!report) return;
    const rows = Array.isArray(report) ? report : [report];
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r: any) => headers.map((h) => `"${r[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${activeReport}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: ReportTab; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "valuation", label: "Stock Valuation" },
    { id: "movement", label: "Stock Movement" },
    { id: "usage", label: "Product Usage" },
    { id: "wastage", label: "Wastage" },
  ];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inventory Reports</h2>
            <p className="text-sm text-muted-foreground">Stock valuation, movement, usage and wastage reports.</p>
          </div>
          {activeReport !== "summary" && (
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={activeReport === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveReport(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {activeReport === "summary" && (
          <>
            {summaryLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                <BoneyardCard rows={2} /><BoneyardCard rows={2} /><BoneyardCard rows={2} />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inventory Value</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">${(report?.inventoryValue ?? 0).toFixed(2)}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Products</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{report?.totalProducts ?? 0}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Low Stock Items</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-amber-500">{report?.lowStockCount ?? 0}</div></CardContent>
                  </Card>
                </div>

                {report?.topProducts?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Top Products by Value</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.topProducts.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium text-sm">{p.name}</TableCell>
                              <TableCell className="text-xs font-mono">{p.sku}</TableCell>
                              <TableCell className="text-right">{p.stock}</TableCell>
                              <TableCell className="text-right">${p.value.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {report?.movement?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">30-Day Movement</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Total Quantity</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.movement.map((m: any) => (
                            <TableRow key={m.type}>
                              <TableCell className="capitalize text-sm">{m.type}</TableCell>
                              <TableCell className="text-right">{m.totalQty}</TableCell>
                              <TableCell className="text-right">{m.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {(activeReport === "valuation" || activeReport === "movement" || activeReport === "usage" || activeReport === "wastage") && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium capitalize">{activeReport.replace("-", " ")} Report</CardTitle>
                {activeReport === "movement" && (
                  <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent border border-border rounded-md px-2 py-1 text-xs">
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
              ) : !report || (Array.isArray(report) && report.length === 0) ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No data available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {report && Array.isArray(report) && report.length > 0 && Object.keys(report[0]).map((key) => (
                          <TableHead key={key} className="capitalize text-xs">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(report) && report.map((row: any, i: number) => (
                        <TableRow key={i}>
                          {Object.entries(row).map(([key, val]: [string, any]) => (
                            <TableCell key={key} className="text-sm">
                              {typeof val === "number" && key.toLowerCase().includes("value") || key.toLowerCase().includes("cost")
                                ? `$${Number(val).toFixed(2)}`
                                : String(val ?? "-")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FeatureGate>
  );
}
