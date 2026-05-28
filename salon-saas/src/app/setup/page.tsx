"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkingHoursEditor, type WorkingHourRow } from "@/components/settings/working-hours-editor";
import { toast } from "@/hooks/use-toast";

const DEFAULT_HOURS: WorkingHourRow[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: "09:00",
  closeTime: "18:00",
  isClosed: i === 0,
}));

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState<WorkingHourRow[]>(DEFAULT_HOURS);

  // Step 1: Business details
  const [salonName, setSalonName] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 2: Branch
  const [branchName, setBranchName] = useState("Main Branch");
  const [branchCity, setBranchCity] = useState("");

  // Step 3: Services
  const [categories] = useState([
    { name: "Hair", services: [{ name: "Haircut", duration: 30, price: 300 }] },
    { name: "Nails", services: [{ name: "Manicure", duration: 45, price: 500 }] },
    { name: "Skin", services: [{ name: "Facial", duration: 60, price: 800 }] },
  ]);

  // Step 4: Tax
  const [taxLabel, setTaxLabel] = useState("GST");
  const [taxRate, setTaxRate] = useState("18");
  const [taxId, setTaxId] = useState("");
  const [invoiceFooter, setInvoiceFooter] = useState("Thank you for your visit!");

  const STEPS = ["Business Details", "Branch Setup", "Services", "Tax & Billing"];

  const handleStep1 = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/setup/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: salonName, phone, logoUrl }),
      });
      if (!res.ok) throw new Error("Failed");
      setStep(2);
    } catch { toast("Failed to save business details"); }
    setLoading(false);
  };

  const handleStep2 = async () => {
    setLoading(true);
    try {
      const branchRes = await fetch("/api/tenant/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: branchName, city: branchCity, isHQ: true }),
      });
      const branchJson = await branchRes.json();
      if (!branchRes.ok) throw new Error("Failed to create branch");
      const newBranchId = branchJson.data.id;
      await fetch(`/api/tenant/branches/${newBranchId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      setStep(3);
    } catch { toast("Failed to save branch"); }
    setLoading(false);
  };

  const handleStep3 = async () => {
    setLoading(true);
    try {
      for (const cat of categories) {
        const catRes = await fetch("/api/tenant/service-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cat.name }),
        });
        const catJson = await catRes.json();
        if (!catRes.ok) continue;
        const catId = catJson.data.id;
        for (const svc of cat.services) {
          await fetch("/api/tenant/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...svc, categoryId: catId, taxable: true }),
          });
        }
      }
      setStep(4);
    } catch { toast("Failed to save services"); }
    setLoading(false);
  };

  const handleStep4 = async () => {
    setLoading(true);
    try {
      await fetch("/api/tenant/setup/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxLabel, taxRate: parseFloat(taxRate), taxId, invoiceFooter }),
      });
      await fetch("/api/tenant/setup/complete", { method: "PATCH" });
      router.replace("/dashboard");
    } catch { toast("Failed to complete setup"); }
    setLoading(false);
  };

  return (
    <>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, idx) => {
          const n = idx + 1;
          return (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${step > n ? "bg-primary text-primary-foreground" : step === n ? "border-2 border-primary text-primary" : "border-2 border-muted text-muted-foreground"}`}>
                {step > n ? "✓" : n}
              </div>
              <span className={`text-sm hidden sm:block ${step === n ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
              {idx < STEPS.length - 1 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Business Details</CardTitle><CardDescription>Tell us about your salon</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Salon Name</Label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder="Glamour Studio" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1">
              <Label>Logo URL (optional)</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://res.cloudinary.com/…" />
              <p className="text-xs text-muted-foreground">Upload to Cloudinary and paste the URL here</p>
            </div>
            <Button onClick={handleStep1} disabled={loading || !salonName} className="w-full">
              {loading ? "Saving…" : "Next →"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>First Branch</CardTitle><CardDescription>Set up your main location and working hours</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Branch Name</Label>
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={branchCity} onChange={(e) => setBranchCity(e.target.value)} placeholder="Mumbai" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Working Hours</Label>
              <WorkingHoursEditor value={hours} onChange={setHours} />
            </div>
            <Button onClick={handleStep2} disabled={loading} className="w-full">
              {loading ? "Saving…" : "Next →"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Services</CardTitle><CardDescription>We've pre-loaded some categories. You can edit later.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.name} className="rounded-lg border p-3 space-y-2">
                <p className="font-medium">{cat.name}</p>
                {cat.services.map((s) => (
                  <p key={s.name} className="text-sm text-muted-foreground pl-3">• {s.name} — {s.duration} min — ₹{s.price}</p>
                ))}
              </div>
            ))}
            <Button onClick={handleStep3} disabled={loading} className="w-full">
              {loading ? "Saving…" : "Next →"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Tax & Billing</CardTitle><CardDescription>Configure invoicing preferences</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tax Label</Label>
                <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} placeholder="GST / VAT / Sales Tax" />
              </div>
              <div className="space-y-1">
                <Label>Tax Rate (%)</Label>
                <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} type="number" step="0.01" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Tax ID (optional)</Label>
                <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="GSTIN / VAT number" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Invoice Footer</Label>
                <Input value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleStep4} disabled={loading} className="w-full">
              {loading ? "Finishing up…" : "Complete Setup"}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
