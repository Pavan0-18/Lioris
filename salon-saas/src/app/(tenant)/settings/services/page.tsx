"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ServiceModal } from "@/components/settings/service-modal";
import { toast } from "sonner";
import { BoneyardTable } from "@/components/ui/boneyard";

export default function SettingsServicesPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data: servicesData, isLoading: servicesLoading, refetch } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetch("/api/tenant/services").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/tenant/service-categories").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const servicesList = servicesData?.data || [];
  const categoriesList = categoriesData?.data || [];

  if (servicesLoading || categoriesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Services Catalog</h2>
            <p className="text-sm text-muted-foreground">Manage service pricing list, categories, and stylist limits.</p>
          </div>
        </div>
        <BoneyardTable rows={5} cols={4} />
      </div>
    );
  }

  const handleSaveService = async (payload: any) => {
    try {
      const res = await fetch("/api/tenant/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Catalog service registered!");
      refetch();
    } catch {
      toast.error("Failed to save service.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services Catalog</h2>
          <p className="text-sm text-muted-foreground">Manage service pricing list, categories, and stylist limits.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add New Service</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    No services configured.
                  </TableCell>
                </TableRow>
              ) : (
                servicesList.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.duration} mins</TableCell>
                    <TableCell className="text-xs font-semibold">${s.price}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{s.taxable ? "YES" : "NO"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={categoriesList}
        onSave={handleSaveService}
      />
    </div>
  );
}
