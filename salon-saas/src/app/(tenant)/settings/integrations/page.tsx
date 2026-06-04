"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, MessageCircle } from "lucide-react";

const providers = [
  { id: "sendgrid", name: "SendGrid", icon: Mail, description: "Transactional email delivery", fields: [{ key: "apiKey", label: "API Key", type: "password" }, { key: "fromEmail", label: "From Email", type: "email" }] },
  { id: "twilio_sms", name: "Twilio SMS", icon: MessageSquare, description: "SMS notifications via Twilio", fields: [{ key: "accountSid", label: "Account SID", type: "text" }, { key: "authToken", label: "Auth Token", type: "password" }, { key: "fromNumber", label: "From Number", type: "text" }] },
  { id: "twilio_whatsapp", name: "Twilio WhatsApp", icon: MessageCircle, description: "WhatsApp messaging via Twilio", fields: [{ key: "accountSid", label: "Account SID", type: "text" }, { key: "authToken", label: "Auth Token", type: "password" }, { key: "fromNumber", label: "WhatsApp Number", type: "text" }] },
];

export default function IntegrationsPage() {
  const [configs, setConfigs] = React.useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["provider-configs"],
    queryFn: () => fetch("/api/tenant/settings/providers").then(res => res.json()),
  });

  React.useEffect(() => {
    if (data?.data) {
      const map: Record<string, any> = {};
      data.data.forEach((p: any) => {
        map[p.provider] = { config: JSON.parse(p.config || "{}"), isActive: p.isActive };
      });
      setConfigs(map);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async ({ provider, config, isActive }: any) => {
      const res = await fetch("/api/tenant/settings/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config, isActive }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => toast.success("Provider configuration saved"),
    onError: () => toast.error("Failed to save configuration"),
  });

  const updateConfig = (providerId: string, key: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        config: { ...(prev[providerId]?.config || {}), [key]: value },
      },
    }));
  };

  const toggleActive = (providerId: string) => {
    const current = configs[providerId];
    saveMutation.mutate({
      provider: providerId,
      config: current?.config || {},
      isActive: !current?.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-playfair text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground/80 mt-1">Connect your email and messaging providers</p>
      </div>

      {providers.map((provider) => {
        const Icon = provider.icon;
        const cfg = configs[provider.id];
        const isActive = cfg?.isActive || false;
        const config = cfg?.config || {};

        return (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <Switch checked={isActive} onCheckedChange={() => toggleActive(provider.id)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {provider.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    value={config[field.key] || ""}
                    onChange={(e) => updateConfig(provider.id, field.key, e.target.value)}
                    placeholder={`Enter ${field.label}`}
                  />
                </div>
              ))}
              <Button
                size="sm"
                onClick={() => saveMutation.mutate({ provider: provider.id, config, isActive })}
                disabled={saveMutation.isPending}
              >
                Save {provider.name} Settings
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
