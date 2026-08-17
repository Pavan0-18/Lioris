"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";

interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export function TwoFactorCard() {
  const queryClient = useQueryClient();
  const [setup, setSetup] = React.useState<TwoFactorSetup | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [token, setToken] = React.useState("");
  const [disablePassword, setDisablePassword] = React.useState("");
  const [showDisable, setShowDisable] = React.useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/tenant/profile").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const enabled = !!profileData?.data?.twoFactorEnabled;

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/profile/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "start" }),
      });
      if (!res.ok) throw new Error("Failed to start 2FA setup");
      return res.json();
    },
    onSuccess: async (data) => {
      const s = data.data as TwoFactorSetup;
      setSetup(s);
      const url = await QRCode.toDataURL(s.otpauthUrl, { width: 240, margin: 2 });
      setQrDataUrl(url);
      toast.success("Scan the QR code with your authenticator app");
    },
    onError: () => toast.error("Failed to start 2FA setup"),
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/profile/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify", secret: setup?.secret, token, backupCodes: setup?.backupCodes }),
      });
      if (!res.ok) throw new Error("Invalid code");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Two-factor authentication enabled");
      setSetup(null);
      setQrDataUrl(null);
      setToken("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Invalid code. Check your authenticator app and try again"),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/profile/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      if (!res.ok) throw new Error("Failed to disable 2FA");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Two-factor authentication disabled");
      setDisablePassword("");
      setShowDisable(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to disable 2FA. Check your password."),
  });

  const handleCancel = () => {
    setSetup(null);
    setQrDataUrl(null);
    setToken("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Two-Factor Authentication
          {enabled && <Badge className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Enabled</Badge>}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account. You&apos;ll need a 6-digit code from an authenticator app at login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && !setup && (
          <Button size="sm" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Enable 2FA
          </Button>
        )}

        {setup && (
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="2FA QR code" className="h-36 w-36 rounded-lg border" />
              )}
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Scan with Google Authenticator, Authy, or any TOTP app.</p>
                <div className="space-y-1">
                  <Label className="text-xs">Manual setup key</Label>
                  <code className="block bg-muted rounded px-2 py-1 text-xs break-all select-all">{setup.secret}</code>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Backup codes (save these — each can be used once)</Label>
              <div className="grid grid-cols-2 gap-1 bg-muted rounded-lg p-3">
                {setup.backupCodes.map((code) => (
                  <code key={code} className="text-xs font-mono select-all">{code}</code>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Verify with a code from your app</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-32 font-mono tracking-widest text-center"
                />
                <Button size="sm" onClick={() => verifyMutation.mutate()} disabled={token.length !== 6 || verifyMutation.isPending}>
                  {verifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Verify & Enable
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {enabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="w-4 h-4" />
              Your account is protected by TOTP two-factor authentication.
            </div>
            {!showDisable ? (
              <Button size="sm" variant="outline" onClick={() => setShowDisable(true)}>
                <ShieldOff className="w-4 h-4" /> Disable 2FA
              </Button>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Enter your password to confirm</Label>
                  <Input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-64"
                    placeholder="Current password"
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!disablePassword || disableMutation.isPending}
                  onClick={() => disableMutation.mutate()}
                >
                  {disableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDisable(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}