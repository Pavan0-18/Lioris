"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeId = "rose" | "lavender" | "spa" | "midnight" | "champagne" | "ruby" | "emerald" | "ocean" | "sunset";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  icon: string;
  lightBg: string;
  darkBg: string;
}

export const themes: ThemeConfig[] = [
  {
    id: "rose",
    name: "Rose Gold",
    description: "Blush pinks & warm rose — timeless elegance",
    icon: "🌹",
    lightBg: "#FFF5F8",
    darkBg: "#0F080A",
  },
  {
    id: "lavender",
    name: "Lavuxe",
    description: "Royal purple & lavender — modern luxury",
    icon: "💜",
    lightBg: "#F8F5FF",
    darkBg: "#0A0810",
  },
  {
    id: "spa",
    name: "Spa Serenity",
    description: "Sage & eucalyptus — pure calm",
    icon: "🌿",
    lightBg: "#F5FFF8",
    darkBg: "#08100A",
  },
  {
    id: "midnight",
    name: "Midnight Glam",
    description: "Deep navy & silver — bold sophistication",
    icon: "🌙",
    lightBg: "#F5F8FF",
    darkBg: "#080A10",
  },
  {
    id: "champagne",
    name: "Champagne Bliss",
    description: "Warm beige & gold — effortless grace",
    icon: "🥂",
    lightBg: "#FFFBF5",
    darkBg: "#100C08",
  },
  {
    id: "ruby",
    name: "Ruby Rouge",
    description: "Rich burgundy & crimson — passionate flair",
    icon: "💎",
    lightBg: "#FFF5F6",
    darkBg: "#10080A",
  },
  {
    id: "emerald",
    name: "Emerald Luxe",
    description: "Deep green & gold — opulent refinement",
    icon: "🟢",
    lightBg: "#F5FFF8",
    darkBg: "#080C0A",
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    description: "Teal & aqua — coastal serenity",
    icon: "🌊",
    lightBg: "#F5FCFF",
    darkBg: "#080C0E",
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    description: "Coral & amber — warm radiance",
    icon: "🌅",
    lightBg: "#FFF8F5",
    darkBg: "#0E0A08",
  },
];

interface ThemeContextType {
  theme: ThemeId;
  isDark: boolean;
  setTheme: (id: ThemeId) => void;
  toggleDark: () => void;
  currentConfig: ThemeConfig;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "rose",
  isDark: false,
  setTheme: () => {},
  toggleDark: () => {},
  currentConfig: themes[0],
  mounted: false,
});

export function ThemeProvider({ children, keyPrefix = "beauty" }: { children: React.ReactNode; keyPrefix?: string }) {
  const [theme, setThemeState] = useState<ThemeId>("rose");
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(`${keyPrefix}-theme`) as ThemeId | null;
    const storedDark = localStorage.getItem(`${keyPrefix}-dark`);
    if (stored && themes.some((t) => t.id === stored)) {
      setThemeState(stored);
    }
    if (storedDark === "true") {
      setIsDark(true);
    }
  }, [keyPrefix]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove(...themes.map((t) => `theme-${t.id}`));
    root.classList.add(`theme-${theme}`);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, isDark, mounted]);

  const setTheme = useCallback(
    (id: ThemeId) => {
      setThemeState(id);
      localStorage.setItem(`${keyPrefix}-theme`, id);
    },
    [keyPrefix]
  );

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(`${keyPrefix}-dark`, String(next));
      return next;
    });
  }, [keyPrefix]);

  const currentConfig = themes.find((t) => t.id === theme) ?? themes[0];

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, setTheme, toggleDark, currentConfig, mounted }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useBeautyTheme() {
  return useContext(ThemeContext);
}
