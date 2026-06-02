"use client";
import React from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AuthLayout, stagger } from "@/components/layouts/auth-layout";
import { FloatingInput } from "@/components/ui/floating-input";
import { LuxuryButton } from "@/components/ui/luxury-button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const focused = focusedField !== null;

  React.useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
      toast.success("Security token sent to email address!");
    } catch {
      toast.error("Failed to generate security token.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout cardTitle="Reset Password" showMicrocopy={false}>
      {sent ? (
        <div className="space-y-6 text-center" style={stagger(5, mounted)}>
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))` }}
          >
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground/70">
            Reset instructions sent to <span className="font-medium text-foreground">{email}</span>
          </p>
          <Link href="/login" className="block">
            <LuxuryButton type="button">Back to Login</LuxuryButton>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" style={stagger(5, mounted)}>
          <p className="text-xs text-center text-muted-foreground/60">
            Enter your email and we&apos;ll send you a reset link
          </p>

          <FloatingInput
            id="email" label="Email Address" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            focused={focusedField === "email"} onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)} autoComplete="email"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            }
          />

          <LuxuryButton loading={submitting} loadingText="Sending...">
            Send Reset Link
          </LuxuryButton>
        </form>
      )}

      <div className="mt-8 pt-7 border-t border-border text-center" style={stagger(6, mounted)}>
        <p className="text-sm text-muted-foreground/60">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
