export const colors = {
  primary: "#F97316",
  background: "#0F1923",
  card: "#1a2636",
  surface: "#1F2937",
  border: "#2a3a4e",
  success: "#4ADE80",
  info: "#60A5FA",
  warning: "#FBBF24",
  error: "#F87171",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textDim: "#6B7280",
  navBg: "#0a1018",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const typography = {
  screenTitle: { fontSize: 22, fontWeight: "700" as const },
  cardTitle: { fontSize: 13, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  bodyLarge: { fontSize: 16, fontWeight: "700" as const },
  body: { fontSize: 14, fontWeight: "600" as const },
  bodySmall: { fontSize: 13 },
  caption: { fontSize: 12 },
  tiny: { fontSize: 11 },
  micro: { fontSize: 10 },
  stat: { fontSize: 22, fontWeight: "700" as const },
  cta: { fontSize: 15, fontWeight: "700" as const },
} as const;
