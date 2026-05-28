"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "SUPER_ADMIN") {
        router.replace("/superadmin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-rose-300/30 border-t-rose-400 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-rose-300/50 text-xs tracking-[0.3em]">LOADING</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
