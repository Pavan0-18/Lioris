"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFilters } from "@/components/inventory/search-filters";
import { format } from "date-fns";

const typeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  purchase: "default",
  usage: "secondary",
  wastage: "destructive",
  adjustment: "outline",
};

export default function TransactionsPage() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const queryParams = new URLSearchParams();
  if (typeFilter) queryParams.set("type", typeFilter);

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["inventory-transactions", typeFilter],
    queryFn: () =>
      fetch(`/api/tenant/inventory/transactions?${queryParams.toString()}`).then((r) => r.json()),
  });

  const transactions = transactionsData?.data || [];

  const filtered = search
    ? transactions.filter(
        (t: any) =>
          t.productName?.toLowerCase().includes(search.toLowerCase()) ||
          t.productSku?.toLowerCase().includes(search.toLowerCase()) ||
          t.reference?.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock History</h2>
          <p className="text-sm text-muted-foreground">View all inventory transactions.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                  <SelectItem value="wastage">Wastage</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="max-w-sm">
                <SearchFilters search={search} onSearchChange={setSearch} showStatus={false} />
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No transactions found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(t.createdAt), "PPp")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{t.productName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{t.productSku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant[t.type] || "outline"} className="text-xs capitalize">
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={t.quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {t.quantity > 0 ? "+" : ""}{t.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.reference || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {t.note || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
