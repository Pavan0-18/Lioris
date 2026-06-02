"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Store } from "lucide-react";

export default function SettingsGeneralPage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [invoiceFooter, setInvoiceFooter] = React.useState("");

  React.useEffect(() => {
    fetch("/api/tenant/settings/general")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setName(json.data.name || "");
          setPhone(json.data.phone || "");
          setLogoUrl(json.data.logoUrl || "");
          setInvoiceFooter(json.data.invoiceFooter || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/tenant/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, logoUrl, invoiceFooter }),
      });
      if (!res.ok) throw new Error();
      toast.success("Salon configurations updated successfully!");
    } catch {
      toast.error("Failed to update general settings.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h2 className="font-playfair text-2xl font-bold tracking-tight">General Settings</h2>
        <p className="text-muted-foreground/80 mt-1">Manage business metadata, branding, and invoice templates</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Salon Business Name</Label>
              <Input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Premium Salon" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Support Line</Label>
              <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input name="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
              <p className="text-xs text-muted-foreground/60">Upload your logo to a CDN and paste the URL here.</p>
            </div>

            {logoUrl && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium mb-3 text-muted-foreground">Preview</p>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl border border-border overflow-hidden bg-card flex items-center justify-center">
                    <img src={logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name || "Your Salon"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{logoUrl}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceFooter">Invoice Footer</Label>
              <Textarea name="invoiceFooter" value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)}
                placeholder="Thank you for visiting! Payments: UPI, Card, Cash" rows={3} />
              <p className="text-xs text-muted-foreground/60">Appears at the bottom of all generated invoices.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" size="lg" className="min-w-[160px]">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
