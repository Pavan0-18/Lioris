import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProviderWrapper } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/hooks/useBeautyTheme";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: "Lioris — Beauty Platform",
  description: "Production-ready multi-tenant salon management software",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-rose">
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <ThemeProvider>
          <SessionProviderWrapper>
            <QueryProvider>
              {children}
              <Toaster position="top-center" richColors closeButton />
            </QueryProvider>
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
