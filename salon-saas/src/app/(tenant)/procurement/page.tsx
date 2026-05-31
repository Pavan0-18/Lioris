"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PurchaseTable } from "@/components/purchases/purchase-table";
import { VendorTable } from "@/components/vendors/vendor-table";
import { toast } from "sonner";
import { Plus, Search, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";

type Tab = "purchases" | "vendors";

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("purchases");
  const [vendorSearch, setVendorSearch] = React.useState("");
  const [purchaseSearch, setPurchaseSearch] = React.useState("");

  const vendorQueryParams = new URLSearchParams();
  if (vendorSearch) vendorQueryParams.set("search", vendorSearch);

  const purchaseQueryParams = new URLSearchParams();
  if (purchaseSearch) purchaseQueryParams.set("search", purchaseSearch);

  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ["procurement-purchases", purchaseSearch],
    queryFn: () => fetch(`/api/tenant/purchases?${purchaseQueryParams.toString()}`).then((r) => r.json()),
  });

  const { data: vendorsData, isLoading: vendorsLoading, refetch: refetchVendors } = useQuery({
    queryKey: ["procurement-vendors", vendorSearch],
    queryFn: () => fetch(`/api/tenant/vendors?${vendorQueryParams.toString()}`).then((r) => r.json()),
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tenant/purchases/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Purchase order deleted");
      refetchPurchases();
    },
    onError: () => toast.error("Failed to delete purchase order"),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tenant/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Vendor deleted");
      refetchVendors();
    },
    onError: () => toast.error("Failed to delete vendor"),
  });

  const orders = purchasesData?.data || [];
  const vendors = vendorsData?.data || [];

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Procurement</h2>
          <p className="text-sm text-muted-foreground">Manage vendors and purchase orders.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "purchases" ? "default" : "outline"}
              onClick={() => setActiveTab("purchases")}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Purchases
            </Button>
            <Button
              variant={activeTab === "vendors" ? "default" : "outline"}
              onClick={() => setActiveTab("vendors")}
              className="gap-2"
            >
              <Truck className="h-4 w-4" />
              Vendors
            </Button>
          </div>

          {activeTab === "purchases" ? (
            <Button asChild>
              <Link href="/procurement/purchases/new">
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/procurement/vendors/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Link>
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {activeTab === "purchases" ? (
              <div className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor or invoice..."
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <PurchaseTable
                  orders={orders}
                  isLoading={purchasesLoading}
                  onDelete={(id) => deletePurchaseMutation.mutate(id)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <VendorTable
                  vendors={vendors}
                  isLoading={vendorsLoading}
                  onDelete={(id) => deleteVendorMutation.mutate(id)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
