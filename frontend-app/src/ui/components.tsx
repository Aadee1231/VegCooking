// src/ui/components.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { theme } from "./theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
}

export const Card = React.forwardRef<View, {
  children: React.ReactNode;
  style?: ViewStyle;
}>(({ children, style }, ref) => {
  return (
    <View
      ref={ref}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing(2),
          ...theme.shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[theme.text.h1, { color: theme.colors.text }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[theme.text.h2, { color: theme.colors.text }, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[theme.text.h3, { color: theme.colors.text }, style]}>{children}</Text>;
}
export function P({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[theme.text.body, { color: theme.colors.text }, style]}>{children}</Text>;
}
export function Muted({ children, style, numberOfLines }: { children: React.ReactNode; style?: TextStyle; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[theme.text.small, { color: theme.colors.subtext }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg =
    variant === "primary"
      ? theme.colors.green
      : variant === "danger"
      ? theme.colors.danger
      : "transparent";

  const border =
    variant === "ghost"
      ? { borderWidth: 1, borderColor: theme.colors.border }
      : null;

  const textColor =
    variant === "primary" ? "#fff" : variant === "danger" ? "#fff" : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: disabled ? "#C7CCD4" : bg,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: theme.radius.md,
        alignItems: "center",
        justifyContent: "center",
        ...((border as any) ?? {}),
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ fontWeight: "800", color: textColor }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  left,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  left?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? "#2E7D32" : theme.colors.chip,
        borderWidth: 1,
        borderColor: active ? "#2E7D32" : theme.colors.border,
      }}
    >
      {left}
      <Text style={{ fontWeight: "700", color: active ? "#fff" : theme.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
