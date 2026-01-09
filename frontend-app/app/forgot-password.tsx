import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../src/lib/supabase";
import { toast } from "../src/lib/toast";
import { router } from "expo-router";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset() {
    if (!email.trim()) {
      toast("Enter your email");
      return;
    }

    setLoading(true);
    try {
      // IMPORTANT: you must add this redirect URL in Supabase Auth settings (next section)
      const redirectTo = "https://veg-cooking.vercel.app/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );

      if (error) {
        toast(error.message);
        return;
      }

      toast("Reset link sent. Check your email.");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={["#0b0f14", "#121826", "#0b0f14"]}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
      >
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "900", color: "white" }}>
            Reset your password
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 8 }}>
            Enter your account email and we’ll send you a reset link.
          </Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={inputStyle}
          />

          <Pressable
            onPress={sendReset}
            disabled={loading}
            style={{
              marginTop: 10,
              backgroundColor: "#2e7d32",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              shadowColor: "#2e7d32",
              shadowOpacity: 0.4,
              shadowRadius: 12,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                Send reset link
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text
              style={{
                textAlign: "center",
                color: "rgba(255,255,255,0.75)",
                fontWeight: "800",
              }}
            >
              Back to sign in
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  marginTop: 14,
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 14,
  color: "white",
  fontSize: 15,
} as const;
