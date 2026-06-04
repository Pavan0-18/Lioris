"use client";
import React from "react";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Camera } from "lucide-react";

export default function CheckInPage() {
  const [code, setCode] = React.useState("");
  const [result, setResult] = React.useState<string | null>(null);

  const handleCheckIn = async () => {
    if (!code.trim()) return;
    setResult(`Checked in appointment/customer via code: ${code}`);
    setCode("");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 pt-12">
      <div className="text-center space-y-2">
        <QrCode className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">QR Check-In</h2>
        <p className="text-sm text-muted-foreground">Scan a QR code or enter an appointment code.</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label>Appointment Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code or scan QR..."
                onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
              />
              <Button onClick={handleCheckIn}><Camera className="h-4 w-4" /></Button>
            </div>
          </div>
          {result && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm">{result}</div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Customer receives a QR code via email/SMS after booking</li>
          <li>Scan the QR code or enter the appointment code manually</li>
          <li>Customer is checked in and staff is notified</li>
        </ol>
      </Card>
    </div>
  );
}
