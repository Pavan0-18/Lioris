"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBeautyTheme, themes } from "@/hooks/useBeautyTheme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Moon, Sun, Check, Sparkles, Cloud, Loader2 } from "lucide-react";

export default function AppearancePage() {
  const { theme: activeTheme, isDark, setTheme, toggleDark, mounted } = useBeautyTheme();
  const [saving, setSaving] = React.useState(false);

  const saveThemeToServer = async (theme: string, dark: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, isDark: dark }),
      });
      if (res.ok) toast.success("Theme saved to server");
    } catch {
      // Silent fail — theme still works locally
    } finally {
      setSaving(false);
    }
  };

  const handleSetTheme = (id: any) => {
    setTheme(id);
    saveThemeToServer(id, isDark);
  };

  const handleToggleDark = () => {
    const next = !isDark;
    toggleDark();
    saveThemeToServer(activeTheme, next);
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded-xl" />
          <div className="h-4 w-72 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Theme Selection
          </CardTitle>
          <CardDescription>
            Choose a colour palette that reflects your salon&apos;s personality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((t) => {
              const isSelected = activeTheme === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => handleSetTheme(t.id)}
                  className={cn(
                    "relative group rounded-2xl border-2 p-4 text-left transition-all duration-300 hover:shadow-lg hover:shadow-black/5",
                    isSelected
                      ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{t.icon}</span>
                    {isSelected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground animate-scale-in">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-playfair text-base font-semibold">{t.name}</h3>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="flex gap-1.5 mt-3">
                    <div
                      className="h-5 w-5 rounded-full border border-border/50"
                      style={{ backgroundColor: t.lightBg }}
                    />
                    <div
                      className="h-5 w-5 rounded-full border border-border/50"
                      style={{ backgroundColor: t.darkBg }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance Mode</CardTitle>
          <CardDescription>Switch between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={!isDark ? "default" : "outline"}
              size="lg"
              onClick={() => { if (isDark) handleToggleDark(); }}
              className="gap-2"
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={isDark ? "default" : "outline"}
              size="lg"
              onClick={() => { if (!isDark) handleToggleDark(); }}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your selected theme looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="p-4 bg-sidebar text-sidebar-foreground flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">Sidebar Preview</span>
            </div>
            <div className="p-6 space-y-4 bg-background">
              <div className="flex gap-3">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">Secondary</Button>
                <Button size="sm" variant="outline">Outline</Button>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  badge
                </span>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                  secondary
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-6 rounded-lg"
                    style={{ backgroundColor: `hsl(var(--chart-${i}))` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 pb-4">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
        Themes are saved to your account and sync across devices
      </div>
    </div>
  );
}
