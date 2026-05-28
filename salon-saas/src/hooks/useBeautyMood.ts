import React from "react";

type Mood = "morning" | "evening" | "night";
type Aura = "default" | "spa" | "bridal" | "nail" | "luxury";

interface MoodTheme {
  mood: Mood;
  aura: Aura;
  baseColors: string[];
  accentHue: number;
  glowIntensity: number;
  textOpacity: number;
  logoOpacity: number;
  animationSpeed: number;
  tagline: string;
  label: string;
  cardReflection: string;
}

const timeThemes: Record<Mood, Omit<MoodTheme, "aura" | "cardReflection">> = {
  morning: {
    mood: "morning",
    baseColors: ["#2d2018", "#36251b", "#3f2a1e", "#2d2018"],
    accentHue: 35,
    glowIntensity: 0.08,
    textOpacity: 0.75,
    logoOpacity: 0.25,
    animationSpeed: 1,
    tagline: "Ready to make today beautiful?",
    label: "Morning",
  },
  evening: {
    mood: "evening",
    baseColors: ["#1f1816", "#281d1a", "#32221d", "#241915"],
    accentHue: 40,
    glowIntensity: 0.12,
    textOpacity: 0.7,
    logoOpacity: 0.3,
    animationSpeed: 0.85,
    tagline: "Let's create confidence.",
    label: "Evening",
  },
  night: {
    mood: "night",
    baseColors: ["#0f0a0c", "#140d10", "#1a1014", "#0f0a0c"],
    accentHue: 345,
    glowIntensity: 0.04,
    textOpacity: 0.55,
    logoOpacity: 0.15,
    animationSpeed: 0.7,
    tagline: "Your salon awaits.",
    label: "Night",
  },
};

const auraOverrides: Record<Aura, Partial<MoodTheme> & { cardReflection: string }> = {
  default: { cardReflection: "rgba(255,255,255,0.03)" },
  spa: {
    accentHue: 150,
    baseColors: ["#141e18", "#1a261e", "#1f2c24", "#141e18"],
    glowIntensity: 0.07,
    cardReflection: "rgba(180,220,200,0.04)",
    tagline: "Find your calm.",
  },
  bridal: {
    accentHue: 340,
    baseColors: ["#2a181e", "#331d24", "#3c222a", "#2a181e"],
    glowIntensity: 0.14,
    cardReflection: "rgba(255,200,210,0.06)",
    tagline: "Your moment shines.",
  },
  nail: {
    accentHue: 300,
    baseColors: ["#221624", "#2b1a2e", "#341f38", "#221624"],
    glowIntensity: 0.1,
    cardReflection: "rgba(220,190,255,0.05)",
    tagline: "Color your world.",
  },
  luxury: {
    accentHue: 40,
    baseColors: ["#0d0a08", "#14100d", "#1a1511", "#0d0a08"],
    glowIntensity: 0.06,
    cardReflection: "rgba(255,230,200,0.03)",
    tagline: "Refined artistry.",
  },
};

function getCurrentMood(): Mood {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "evening";
  return "night";
}

function mergeTheme(base: Omit<MoodTheme, "aura" | "cardReflection">, aura: Aura): MoodTheme {
  const override = auraOverrides[aura];
  return {
    mood: base.mood,
    aura,
    baseColors: override.baseColors ?? base.baseColors,
    accentHue: override.accentHue ?? base.accentHue,
    glowIntensity: override.glowIntensity ?? base.glowIntensity,
    textOpacity: override.textOpacity ?? base.textOpacity,
    logoOpacity: override.logoOpacity ?? base.logoOpacity,
    animationSpeed: override.animationSpeed ?? base.animationSpeed,
    tagline: override.tagline ?? base.tagline,
    label: override.label ?? base.label,
    cardReflection: override.cardReflection,
  };
}

export function useBeautyMood(initialAura?: Aura) {
  const [mood, setMood] = React.useState<Mood>(getCurrentMood);
  const [aura, setAura] = React.useState<Aura>(initialAura ?? "default");

  React.useEffect(() => {
    const tick = () => {
      const current = getCurrentMood();
      setMood((prev) => (prev !== current ? current : prev));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const theme = React.useMemo(() => mergeTheme(timeThemes[mood], aura), [mood, aura]);

  return { ...theme, setAura };
}
