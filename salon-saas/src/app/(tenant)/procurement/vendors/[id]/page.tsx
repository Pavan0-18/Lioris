"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorForm } from "@/components/vendors/vendor-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor", params.id],
    queryFn: () => fetch(`/api/tenant/vendors/${params.id}`).then((r) => r.json()),
    enabled: !!params.id,
  });

  const vendor = data?.data;

  const onSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/vendors/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      toast.success("Vendor updated");
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      router.push("/procurement/vendors");
    } catch {
      toast.error("Failed to update vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureGate feature="INVENTORY">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/procurement/vendors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isLoading ? "Loading..." : vendor?.name || "Vendor"}
            </h2>
            <p className="text-sm text-muted-foreground">Edit vendor details.</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : vendor ? (
              <VendorForm
                defaultValues={{
                  name: vendor.name,
                  contactPerson: vendor.contactPerson || "",
                  phone: vendor.phone || "",
                  email: vendor.email || "",
                  address: vendor.address || "",
                  notes: vendor.notes || "",
                }}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Vendor not found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
