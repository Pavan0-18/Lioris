"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsGeneralPage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    fetch("/api/tenant/settings/general")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setName(json.data.name || "");
          setPhone(json.data.phone || "");
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
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) throw new Error();
      toast.success("Salon configurations updated successfully!");
    } catch {
      toast.error("Failed to update general settings.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">General Settings</h2>
        <p className="text-sm text-muted-foreground">Configure business metadata and invoices templates.</p>
      </div>

      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Salon Business Name</Label>
              <Input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Premium Salon" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Support Line</Label>
              <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <Button type="submit">Save Configurations</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
