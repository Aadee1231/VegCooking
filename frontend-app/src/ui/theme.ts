// src/ui/theme.ts
export const theme = {
  colors: {
    bg: "#F7F8FA",
    card: "#FFFFFF",
    text: "#111827",
    subtext: "#6B7280",
    border: "#E5E7EB",
    green: "#2E7D32",
    greenDark: "#1B5E20",
    danger: "#D32F2F",
    chip: "#EEF2F7",
    brand50: "#e8f5e9",
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  spacing: (n: number) => n * 8,
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  },
  text: {
    h1: { fontSize: 28, fontWeight: "800" as const },
    h2: { fontSize: 22, fontWeight: "800" as const },
    h3: { fontSize: 18, fontWeight: "800" as const },
    body: { fontSize: 15, fontWeight: "500" as const },
    small: { fontSize: 13, fontWeight: "500" as const },
  },
};
