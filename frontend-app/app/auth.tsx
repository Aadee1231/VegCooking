import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../src/lib/supabase";
import { toast } from "../src/lib/toast";
import { router } from "expo-router";

function isLikelyEmail(value: string) {
  // simple + effective for login field
  return value.includes("@") && value.includes(".");
}

export default function AuthScreen() {
  // NOTE: for sign-in we use identifier; for sign-up we still collect email
  const [identifier, setIdentifier] = useState(""); // email OR username (sign-in)
  const [email, setEmail] = useState(""); // sign-up email
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const primaryFieldLabel = useMemo(() => {
    return isSignup ? "Email" : "Email or Username";
  }, [isSignup]);

  const primaryFieldValue = useMemo(() => {
    return isSignup ? email : identifier;
  }, [isSignup, email, identifier]);

  const setPrimaryFieldValue = (v: string) => {
    if (isSignup) setEmail(v);
    else setIdentifier(v);
  };

  async function resolveEmailFromIdentifier(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (isLikelyEmail(trimmed)) return trimmed.toLowerCase();

    // treat as username: look up email in profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", trimmed)
      .maybeSingle();

    if (error) throw error;
    return data?.email ?? null;
  }

  async function handleAuth() {
    const trimmedPassword = password.trim();

    if (isSignup) {
      if (!email.trim() || !trimmedPassword || !username.trim()) {
        toast("Please fill in all fields");
        return;
      }
    } else {
      if (!identifier.trim() || !trimmedPassword) {
        toast("Please fill in all fields");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignup) {
        // 1) Create auth user
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: trimmedPassword,
          options: {
            data: { username: username.trim() },
            // IMPORTANT: email confirm redirects depend on your Supabase Auth settings (we’ll do below)
          },
        });

        if (error) {
          toast(error.message);
          return;
        }

        // 2) Create profile row (best-effort)
        // In Supabase, signUp may or may not immediately create a session depending on email confirmation settings.
        // But we DO know the user id from data.user.
        const userId = data.user?.id;
        if (userId) {
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: userId,
              username: username.trim(),
              email: email.trim().toLowerCase(),
            },
            { onConflict: "id" }
          );

          // If this fails, we still allow signup but tell them (rare)
          if (profileError) {
            console.error("Profile upsert error:", profileError);
          }
        }

        toast("Check your email to confirm your account");
        return;
      }

      // SIGN IN (email OR username)
      const resolvedEmail = await resolveEmailFromIdentifier(identifier);

      if (!resolvedEmail) {
        toast("No account found for that username/email");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: trimmedPassword,
      });

      if (error) {
        toast(error.message);
        return;
      }

      router.replace("/tabs/feed");
    } catch (e: any) {
      console.error("Auth error:", e);
      toast(e?.message ?? "Something went wrong");
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
      style={{
        flex: 1,
        paddingTop: 80,        // 👈 pushes content from top
        paddingHorizontal: 24,
      }}
    >
      
        {/* Logo */}
        <Image
          source={require("../assets/FlavurLogo.png")}
          style={{
            width: 96,
            height: 96,
            alignSelf: "center",
            marginBottom: 16,
          }}
          resizeMode="contain"
        />

        {/* Brand */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: "900",
            color: "white",
            textAlign: "center",
            letterSpacing: 0.4,
          }}
        >
          Flavur
        </Text>

        <Text
          style={{
            marginTop: 6,
            marginBottom: 28,
            textAlign: "center",
            color: "rgba(255,255,255,0.75)",
            fontSize: 15,
          }}
        >
          The Future of Cooking
        </Text>

        {/* Card */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: "white",
              marginBottom: 6,
            }}
          >
            {isSignup ? "Create your account" : "Welcome back"}
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.65)",
              marginBottom: 18,
            }}
          >
            {isSignup
              ? "Join Flavur and start cooking smarter"
              : "Sign in to continue"}
          </Text>

          {isSignup && (
            <TextInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={inputStyle}
            />
          )}

          <TextInput
            placeholder={primaryFieldLabel}
            value={primaryFieldValue}
            onChangeText={setPrimaryFieldValue}
            autoCapitalize="none"
            keyboardType={isSignup ? "email-address" : "default"}
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={inputStyle}
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={inputStyle}
          />

          {!isSignup && (
            <Pressable
              onPress={() => router.push("/forgot-password")}
              style={{ marginTop: 2, marginBottom: 8 }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  textAlign: "right",
                  fontWeight: "700",
                }}
              >
                Forgot password?
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleAuth}
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
              <Text
                style={{
                  color: "white",
                  fontWeight: "900",
                  fontSize: 15,
                }}
              >
                {isSignup ? "Create Account" : "Sign In"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Toggle */}
        <Pressable
          onPress={() => {
            setIsSignup(!isSignup);
            // reset fields that confuse people
            setPassword("");
          }}
          style={{ marginTop: 18 }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#2e7d32",
              fontWeight: "800",
            }}
          >
            {isSignup
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Text>
        </Pressable>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 14,
  color: "white",
  marginBottom: 12,
  fontSize: 15,
} as const;
