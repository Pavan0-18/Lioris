"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthLayout, stagger } from "@/components/layouts/auth-layout";
import { FloatingInput } from "@/components/ui/floating-input";
import { LuxuryButton } from "@/components/ui/luxury-button";

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SG", label: "Singapore" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
];

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const [countryOpen, setCountryOpen] = React.useState(false);

  const focused = focusedField !== null;

  const [formData, setFormData] = React.useState({
    salonName: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    country: "IN",
  });

  React.useEffect(() => { setMounted(true); }, []);

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Signup failed");

      await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        loginType: "tenant",
      });

      toast.success("Workspace created!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      aura="spa"
      focused={focused}
      cardTitle="Create Workspace"
      showMicrocopy={false}
    >
      <form onSubmit={onSubmit} className="space-y-3.5" style={stagger(5, mounted)}>
        <FloatingInput
          id="salonName"
          label="Salon Name"
          type="text"
          value={formData.salonName}
          onChange={updateField("salonName")}
          focused={focusedField === "salonName"}
          onFocus={() => setFocusedField("salonName")}
          onBlur={() => setFocusedField(null)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          }
        />

        <FloatingInput
          id="name"
          label="Your Name"
          type="text"
          value={formData.name}
          onChange={updateField("name")}
          focused={focusedField === "name"}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        />

        <FloatingInput
          id="email"
          label="Business Email"
          type="email"
          value={formData.email}
          onChange={updateField("email")}
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
          type="password"
          value={formData.password}
          onChange={updateField("password")}
          focused={focusedField === "password"}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            id="phone"
            label="Phone"
            type="text"
            value={formData.phone}
            onChange={updateField("phone")}
            focused={focusedField === "phone"}
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField(null)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            }
          />

          <div className="relative group">
            <div
              className="relative rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
              style={{
                boxShadow: countryOpen
                  ? `0 0 0 1px rgba(255, 200, 180, 0.15), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 30px rgba(255, 180, 160, 0.05)`
                  : `inset 0 1px 0 rgba(255,255,255,0.02)`,
                background: countryOpen
                  ? `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.03) 100%)`
                  : `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.02) 100%)`,
              }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/12 z-10" style={{ opacity: 0.06 }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <div
                onClick={() => setCountryOpen(!countryOpen)}
                className="pt-5 pb-3 pl-4 pr-12 text-sm outline-none transition-all duration-500"
                style={{ color: formData.country ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}
              >
                {COUNTRIES.find((c) => c.code === formData.country)?.label || "Country"}
              </div>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 transition-transform duration-300" style={{ color: 'rgba(255,255,255,0.25)', transform: countryOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>

            {countryOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCountryOpen(false)} />
                <div className="absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden backdrop-blur-xl border" style={{
                  backgroundColor: 'rgba(20,15,15,0.95)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                }}>
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setFormData((prev) => ({ ...prev, country: c.code })); setCountryOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-all duration-300 hover:bg-white/[0.04]"
                      style={{
                        color: formData.country === c.code ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                        backgroundColor: formData.country === c.code ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <LuxuryButton loading={submitting} loadingText="Creating...">
          Register & Sign In
        </LuxuryButton>
      </form>

      <div className="mt-8 pt-7 border-t text-center transition-all duration-700" style={{ borderColor: `rgba(255,255,255,0.12)`, ...stagger(6, mounted) }}>
        <p className="text-sm transition-all duration-700" style={{ opacity: 0.2, color: 'white', letterSpacing: '0.02em' }}>
          Already have a workspace?{" "}
          <Link
            href="/login"
            className="font-medium transition-all duration-300 hover:opacity-60"
            style={{ opacity: 0.45, color: 'white' }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
