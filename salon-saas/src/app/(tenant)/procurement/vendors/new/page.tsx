"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorForm } from "@/components/vendors/vendor-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewVendorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      toast.success("Vendor created");
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      router.push("/procurement/vendors");
    } catch {
      toast.error("Failed to create vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Vendor</h2>
          <p className="text-sm text-muted-foreground">Add a new supplier or vendor.</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
