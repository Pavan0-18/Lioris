"use client";
import React from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { AuthLayout, stagger } from "@/components/layouts/auth-layout";
import { FloatingInput } from "@/components/ui/floating-input";
import { LuxuryButton } from "@/components/ui/luxury-button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "tenant";
  const auraParam = searchParams.get("aura") as "spa" | "bridal" | "nail" | "luxury" | undefined;

  const [submitting, setSubmitting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<"email" | "password" | null>(null);
  const [mounted, setMounted] = React.useState(false);

  const focused = focusedField !== null;

  React.useEffect(() => { setMounted(true); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      console.log(`[LoginPage] Attempting login for ${email} with type: ${type}`);
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        loginType: type,
      });
      
      console.log(`[LoginPage] SignIn result:`, res);
      
      if (res?.error) {
        console.error(`[LoginPage] Sign in error: ${res.error}`);
        toast.error(`Login failed: ${res.error === "CredentialsSignin" ? "Invalid email or password" : res.error}`);
      } else if (res?.ok) {
        toast.success("Welcome back!");
        // Redirect to appropriate dashboard
        const redirectUrl = type === "superadmin" ? "/superadmin/dashboard" : "/";
        console.log(`[LoginPage] Redirecting to: ${redirectUrl}`);
        router.push(redirectUrl);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } catch (error) {
      console.error("[LoginPage] Login error:", error);
      toast.error("An error occurred during login. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout aura={auraParam} focused={focused} cardTitle="Welcome" showGreeting editorial>
      <form onSubmit={onSubmit} className="space-y-4" style={stagger(5, mounted)}>
        <FloatingInput
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          focused={focusedField === "email"}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          autoComplete="email"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          }
        />

        <FloatingInput
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          focused={focusedField === "password"}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          autoComplete="current-password"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        >
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="transition-colors"
            style={{ opacity: 0.2, color: 'white' }}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </FloatingInput>

        <div className="flex justify-end pt-0.5">
          <Link
            href="/forgot-password"
            className="text-[11px] transition-all duration-300 hover:opacity-60"
            style={{ opacity: 0.25, color: 'white', letterSpacing: '0.05em' }}
          >
            Forgot password?
          </Link>
        </div>

        <LuxuryButton loading={submitting} loadingText="Signing in...">
          Sign In
        </LuxuryButton>
      </form>

      {type !== "superadmin" && (
        <div className="mt-8 pt-7 border-t text-center transition-all duration-700" style={{ borderColor: `rgba(255,255,255,0.12)`, ...stagger(6, mounted) }}>
          <p className="text-sm transition-all duration-700" style={{ opacity: 0.2, color: 'white', letterSpacing: '0.02em' }}>
            New to Lioris?{" "}
            <Link
              href="/signup"
              className="font-medium transition-all duration-300 hover:opacity-60"
              style={{ opacity: 0.45, color: 'white' }}
            >
              Create workspace
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
