import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  TextInput,
  Pressable,
  Dimensions,
  StatusBar,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "../../src/ui/components";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

const { width, height } = Dimensions.get("window");

/* ───────────────────────── Shimmer Background ───────────────────────── */

function ShimmerOverlay() {
  const shimmer = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);
  
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });
  
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "transparent",
      }}
    >
      <Animated.View
        style={{
          width: width * 0.6,
          height: "100%",
          transform: [{ translateX }],
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      />
    </Animated.View>
  );
}

/* ───────────────────────── Particle ───────────────────────── */

function Particle({ delay }: { delay: number }) {
  const translateY = useRef(new Animated.Value(height + 40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -60,
            duration: 12000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 4000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: height + 40,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();
    return () => anim.stop(); // 🔑 prevents _tracking crash
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 2,
        height: 2,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.25)",
        left: Math.random() * width,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

/* ───────────────────────── Screen ───────────────────────── */

export default function FlavurAIScreen() {
  const [submitted, setSubmitted] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const [email, setEmail] = useState("");

  /* Logo pulse */
  useFocusEffect(() => {
    pulse.setValue(0);

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();

    return () => anim.stop();
  });


  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Screen>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={["#0a0e13", "#1a2332", "#0f1419", "#0a0e13"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Particles */}
        {Array.from({ length: 24 }).map((_, i) => (
          <Particle key={i} delay={i * 450} />
        ))}

        {/* ENHANCED LOGO WITH GLOW EFFECT */}
        <Animated.View 
          style={{ 
            transform: [{ scale }], 
            marginBottom: 32,
            position: "relative",
          }}
        >
          {/* Animated glow rings */}
          <Animated.View
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(46, 125, 50, 0.08)",
              top: -20,
              left: -20,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(255, 107, 53, 0.1)",
              top: -10,
              left: -10,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
            }}
          />
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "rgba(46, 125, 50, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Image
              source={require("../../assets/FlavurLogo.png")}
              style={{
                width: 100,
                height: 100,
                backgroundColor: "transparent",
              }}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* ANIMATED TITLE WITH ENHANCED EFFECTS */}
        <Animated.View
          style={{
            transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        >
          <Text
            style={{
              fontSize: 42,
              fontWeight: "900",
              color: "#fff",
              letterSpacing: 3,
              textAlign: "center",
              textShadowColor: "rgba(46, 125, 50, 0.8)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}
          >
            FlavurAI
          </Text>
          <View style={{
            height: 2,
            width: 100,
            backgroundColor: "linear-gradient(90deg, transparent, #2e7d32, transparent)",
            alignSelf: "center",
            marginTop: 8,
            borderRadius: 1,
          }} />
        </Animated.View>

        {/* ENHANCED DESCRIPTION */}
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              lineHeight: 26,
              maxWidth: 320,
              fontWeight: "500",
            }}
          >
            Your AI cooking assistant is almost here
          </Text>
          <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(46, 125, 50, 0.15)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}>
              <Ionicons name="bulb" size={14} color="#2e7d32" />
              <Text style={{ color: "#2e7d32", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>
                Smarter planning
              </Text>
            </View>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(46, 125, 50, 0.15)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}>
              <Ionicons name="headset" size={14} color="#2e7d32" />
              <Text style={{ color: "#2e7d32", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>
                Live help
              </Text>
            </View>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(46, 125, 50, 0.15)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}>
              <Ionicons name="happy" size={14} color="#2e7d32" />
              <Text style={{ color: "#2e7d32", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>
                Zero stress
              </Text>
            </View>
          </View>
        </View>

        {/* ENHANCED WAITLIST */}
        <View style={{ marginTop: 40, width: "100%", maxWidth: 340 }}>
          {!submitted ? (
            <>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    borderWidth: 2,
                    borderColor: "rgba(46, 125, 50, 0.3)",
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    color: "#fff",
                    fontSize: 16,
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                />
                {email.length > 0 && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#2e7d32"
                    style={{ position: "absolute", right: 16, top: 18 }}
                  />
                )}
              </View>

              <Pressable
                onPress={() => {
                  if (!email.trim()) return;
                  setSubmitted(true);
                }}
                style={{
                  backgroundColor: "#2e7d32",
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="rocket" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                    Join the waitlist
                  </Text>
                </View>
              </Pressable>
            </>
          ) : (
            <View
              style={{
                backgroundColor: "rgba(46,125,50,0.15)",
                borderRadius: 18,
                padding: 20,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "rgba(46,125,50,0.4)",
              }}
            >
              <Ionicons name="checkmark-circle" size={36} color="#2e7d32" />
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 18,
                  fontWeight: "900",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                You're on the waitlist 🎉
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  color: "rgba(255,255,255,0.85)",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Thank you for joining! We'll keep you updated as FlavurAI gets closer to launch.
              </Text>
            </View>
          )}
        </View>


        {/* ENHANCED COMING SOON */}
        <View
          style={{
            marginTop: 32,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: "rgba(46, 125, 50, 0.4)",
            backgroundColor: "rgba(46, 125, 50, 0.08)",
            backdropFilter: "blur(10px)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="time" size={16} color="#2e7d32" />
            <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 14 }}>
              Coming Soon
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Screen>
  );
}
