"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BoneyardCard, BoneyardText } from "@/components/ui/boneyard";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Camera, Loader2, CheckCircle2, XCircle, User, Clock, Scissors } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

interface CheckInResult {
  appointment: {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
    staff: string | null;
    services: { name: string; price: number; duration: number }[];
    totalDuration: number;
    totalPrice: number;
  };
  customer: { id: string; name: string; phone: string; email: string | null };
  branch: string | null;
}

export default function CheckInPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = React.useState("");
  const [result, setResult] = React.useState<CheckInResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debouncedCode = useDebounce(code, 500);

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ["check-in-today"],
    queryFn: () => fetch("/api/tenant/check-in").then((res) => res.json()),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const checkInMutation = useMutation({
    mutationFn: async (checkInCode: string) => {
      const res = await fetch("/api/tenant/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: checkInCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Check-in failed");
      return json.data as CheckInResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["check-in-today"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`${data.customer.name} checked in`);
    },
    onError: (err: Error) => {
      setResult(null);
      setError(err.message);
    },
  });

  React.useEffect(() => {
    if (debouncedCode.length === 8) {
      checkInMutation.mutate(debouncedCode.toUpperCase());
    }
  }, [debouncedCode]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 8) {
      toast.error("Check-in codes are 8 characters");
      return;
    }
    checkInMutation.mutate(clean);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-8 animate-fade-in">
      <div className="text-center space-y-2">
        <QrCode className="h-12 w-12 mx-auto text-primary" />
        <h2 className="font-playfair text-2xl font-bold tracking-tight">QR Check-In</h2>
        <p className="text-sm text-muted-foreground">Scan a QR code or enter an 8-character appointment code.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Appointment Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                ref={inputRef}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
                  setError(null);
                }}
                placeholder="e.g. A3K9P2QX"
                className="font-mono tracking-widest uppercase"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={checkInMutation.isPending}
              />
              <Button type="submit" disabled={code.length !== 8 || checkInMutation.isPending}>
                {checkInMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Check In
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Codes are shown after booking and can be scanned from the customer&apos;s confirmation.
            </p>
          </div>

          {checkInMutation.isPending && (
            <div className="space-y-3">
              <BoneyardCard rows={2} />
            </div>
          )}

          {result && !checkInMutation.isPending && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold">{result.customer.name} is checked in</span>
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Checked In</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {result.customer.phone || "No phone"}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(result.appointment.startTime), "EEE, MMM d 'at' h:mm a")}
                </div>
                {result.appointment.staff && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scissors className="h-4 w-4" />
                    {result.appointment.staff}
                  </div>
                )}
                {result.branch && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {result.branch}
                  </div>
                )}
              </div>
              {result.appointment.services.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.appointment.services.map((s) => (
                    <Badge key={s.name} variant="outline">{s.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && !checkInMutation.isPending && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-2 animate-fade-in">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{error}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Try another code or scan the customer&apos;s QR again.</p>
              </div>
            </div>
          )}
        </form>
      </Card>

      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">Checked in today</CardTitle>
          <CardDescription>Customers checked in by your team so far today.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-2">
          {todayLoading ? (
            <BoneyardText lines={3} />
          ) : (todayData?.data?.checkedInToday || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No check-ins yet today.</p>
          ) : (
            todayData.data.checkedInToday.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{a.customerName}</p>
                  <p className="text-xs text-muted-foreground">{a.customerPhone}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(a.startTime), "h:mm a")}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Customer receives an 8-character check-in code after booking</li>
          <li>Scan the QR code or enter the code manually</li>
          <li>Customer is checked in, staff is notified, and the appointment moves to In Progress</li>
        </ol>
      </Card>
    </div>
  );
}