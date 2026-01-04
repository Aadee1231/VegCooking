import { useEffect, useState } from "react";
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

export default function ResetPassword() {
  const [loading, setLoading] = useState(true);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    // When user opens the reset link, Supabase uses it to establish a recovery session.
    // We just need to wait briefly and confirm we actually have a session.
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setLoading(false);

      if (!data.session) {
        toast("Invalid or expired reset link. Try again.");
        router.replace("/auth");
      }
    };

    run();
  }, []);

  async function saveNewPassword() {
    if (!pw1 || pw1.length < 8) {
      toast("Password must be at least 8 characters");
      return;
    }
    if (pw1 !== pw2) {
      toast("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        toast(error.message);
        return;
      }

      toast("Password updated. You’re signed in.");
      router.replace("/tabs/feed");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
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
            Set a new password
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 8 }}>
            Choose a strong password you’ll remember.
          </Text>

          <TextInput
            placeholder="New password"
            value={pw1}
            onChangeText={setPw1}
            secureTextEntry
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={inputStyle}
          />

          <TextInput
            placeholder="Confirm new password"
            value={pw2}
            onChangeText={setPw2}
            secureTextEntry
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={inputStyle}
          />

          <Pressable
            onPress={saveNewPassword}
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
                Update password
              </Text>
            )}
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
