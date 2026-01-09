import { toast } from "@/src/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  UIManager,
  View
} from "react-native";
import { resolveImageUrl } from "../../src/lib/images";
import { resolveIngredientEmoji } from "../../src/lib/ingredientEmoji";
import { supabase } from "../../src/lib/supabase";





/**
 * CREATE RECIPE (MOBILE) — ONE FILE
 * - Create + Edit (via ?id=123)
 * - Modern sections + icons + card UI
 * - Cover image picker + preview + remove
 * - Tags multi-select chips
 * - Ingredients:
 *   - Search ingredient modal (Supabase ilike)
 *   - Add new ingredient (confirm)
 *   - Delete ingredient if created_by == current user (optional)
 *   - Qty + unit + notes
 *   - Reorder up/down
 * - Steps:
 *   - Multiline steps
 *   - Reorder up/down
 * - AI Import:
 *   - Import from camera roll (multipart)
 *   - Import from app (JSON)
 * - Validation + toast
 * - Save/update + delete recipe
 *
 * Requirements:
 * - supabase tables like web:
 *   - recipes
 *   - recipe_ingredients (recipe_id, ingredient_id, quantity, unit_code, notes, position)
 *   - recipe_steps (recipe_id, position, body)
 *   - ingredients (id, name, created_by)
 * - storage bucket: recipe-media
 * - optional backend endpoints:
 *   - POST {API_BASE}/video-import (FormData: video)
 *   - POST {API_BASE}/video-import-url ({ url })
 */

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ----------------------------- Theme ----------------------------- */

const BRAND = "#2E7D32";
const BRAND_DARK = "#1B5E20";
const BG = "#F6F7F8";
const CARD = "#FFFFFF";
const TEXT = "#101828";
const SUBTEXT = "#667085";
const BORDER = "#E5E7EB";
const DANGER = "#D92D20";
const WARNING = "#F79009";

const RADIUS = 18;

const spacing = (n: number) => n * 8;

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 3,
  },
});

/* ----------------------------- Data ----------------------------- */

type Difficulty = "" | "Easy" | "Medium" | "Hard";
type IngredientRow = {
  id: number;
  name: string;
  created_by: string | null;
  emoji: string | null;
};

type Line = {
  position: number;
  ingredient: IngredientRow | null;
  quantity: string; // keep as string for TextInput, convert on save
  unit_code: string;
  notes: string;
};

type Step = {
  position: number;
  body: string;
};

const TAG_OPTIONS: { label: string; icon: any }[] = [
  { label: "Vegan", icon: "leaf-outline" },
  { label: "Vegetarian", icon: "nutrition-outline" },
  { label: "Gluten-Free", icon: "ban-outline" },
  { label: "Dairy-Free", icon: "water-outline" },
  { label: "Healthy", icon: "heart-outline" },
  { label: "Dessert", icon: "ice-cream-outline" },
  { label: "Comfort Food", icon: "restaurant-outline" },   
  { label: "Quick", icon: "flash-outline" },
  { label: "Breakfast", icon: "sunny-outline" },
  { label: "Dinner", icon: "moon-outline" },
  { label: "Spicy", icon: "flame-outline" },
];

const UNITS = ["", "g", "kg", "oz", "ml", "l", "tsp", "tbsp", "cup", "pc", "lb"];

/* ----------------------------- Helpers ----------------------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function niceFileName(uri?: string, fallback = "file") {
  if (!uri) return fallback;
  const parts = uri.split("/");
  const last = parts[parts.length - 1];
  return last || fallback;
}


async function pickMedia(type: "image" | "video") {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    toast("Permission required to access photos");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:
      type === "image"
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled) return;

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.fileName ?? `${type}_${Date.now()}`,
    type: asset.mimeType ?? (type === "image" ? "image/jpeg" : "video/mp4"),
  };
}


function moveItem<T>(arr: T[], fromIndex: number, toIndex: number) {
  const copy = [...arr];
  const item = copy.splice(fromIndex, 1)[0];
  copy.splice(toIndex, 0, item);
  return copy;
}

function timeLooksOk(t: string) {
  // same spirit as web: must start with a number, optional unit
  // examples: "20 min", "1 hr", "45 minutes", "10"
  if (!t.trim()) return true;
  return /^\d+\s*(min|mins|minutes|hr|hrs|hour|hours)?$/i.test(t.trim());
}

function sanitizeQuantityInput(raw: string) {
  // Allow ONLY digits, space, slash, dot
  let s = raw.replace(/[^\d\/.\s]/g, "");

  // No negative signs (just in case)
  s = s.replace(/-/g, "");

  // Collapse multiple spaces to single
  s = s.replace(/\s+/g, " ");

  // Trim LEFT only (keep right-trailing space while typing)
  // so "1 " remains possible while user continues typing
  s = s.replace(/^\s+/, "");

  // Only allow ONE "/" total
  const firstSlash = s.indexOf("/");
  if (firstSlash !== -1) {
    // remove any extra slashes after the first
    s =
      s.slice(0, firstSlash + 1) +
      s
        .slice(firstSlash + 1)
        .replace(/\//g, "");
  }

  // Only allow ONE "." total (and not together with "/")
  const hasSlash = s.includes("/");
  if (hasSlash) {
    // If fraction form, remove dots entirely
    s = s.replace(/\./g, "");
  } else {
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      s =
        s.slice(0, firstDot + 1) +
        s
          .slice(firstDot + 1)
          .replace(/\./g, "");
    }
  }

  // If there's a space, enforce mixed-fraction shape: "<whole> <fraction>"
  // Remove any additional spaces beyond the first
  const firstSpace = s.indexOf(" ");
  if (firstSpace !== -1) {
    s =
      s.slice(0, firstSpace + 1) +
      s
        .slice(firstSpace + 1)
        .replace(/ /g, "");
  }

  return s;
}

function parseQuantityToNumber(qtyRaw: string): number | null {
  const qty = qtyRaw.trim();
  if (!qty) return null;

  // Decimal: "0.5", "2", "2.25"
  if (/^\d+(\.\d+)?$/.test(qty)) {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // Fraction: "1/2"
  if (/^\d+\/\d+$/.test(qty)) {
    const [a, b] = qty.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    const n = a / b;
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // Mixed fraction: "1 1/2"
  if (/^\d+\s+\d+\/\d+$/.test(qty)) {
    const [wholeStr, fracStr] = qty.split(" ");
    const whole = Number(wholeStr);
    const [a, b] = fracStr.split("/").map(Number);
    if (!Number.isFinite(whole) || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    const n = whole + a / b;
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // Anything else = invalid
  return null;
}

function isValidQuantityWhileTyping(qty: string) {
  // Allow partial states so "/" + space work:
  // "", "1", "1.", "1/","1/2", "1 ", "1 1", "1 1/", "1 1/2"
  if (qty === "") return true;

  // decimals while typing
  if (/^\d+(\.)?$/.test(qty)) return true;
  if (/^\d+(\.\d+)?$/.test(qty)) return true;

  // fraction while typing
  if (/^\d+\/?$/.test(qty)) return true;      // "1" or "1/"
  if (/^\d+\/\d+$/.test(qty)) return true;    // "1/2"

  // mixed while typing
  if (/^\d+\s?$/.test(qty)) return true;          // "1" or "1 "
  if (/^\d+\s+\d+\/?$/.test(qty)) return true;    // "1 1" or "1 1/"
  if (/^\d+\s+\d+\/\d+$/.test(qty)) return true;  // "1 1/2"

  return false;
}


/* ----------------------------- Toast ----------------------------- */

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<"ok" | "warn" | "err">("ok");
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = useCallback(
    (m: string, k: "ok" | "warn" | "err" = "ok") => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(m);
      setKind(k);
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      timer.current = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => setMsg(null));
      }, 2400);
    },
    [anim]
  );

  const ToastHost = useCallback(() => {
    if (!msg) return null;
    const bg =
      kind === "ok" ? BRAND : kind === "warn" ? WARNING : DANGER;

    return (
      <Animated.View
        style={{
          position: "absolute",
          top: Platform.OS === "ios" ? 56 : 22,
          alignSelf: "center",
          zIndex: 999,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-14, 0],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            backgroundColor: bg,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            maxWidth: 320,
          }}
        >
          <Ionicons
            name={
              kind === "ok"
                ? "checkmark-circle-outline"
                : kind === "warn"
                ? "alert-circle-outline"
                : "close-circle-outline"
            }
            size={18}
            color="#fff"
          />
          <Text style={{ color: "#fff", fontWeight: "700" }} numberOfLines={2}>
            {msg}
          </Text>
        </View>
      </Animated.View>
    );
  }, [anim, kind, msg]);

  return { show, ToastHost };
}

/* ----------------------------- UI Bits ----------------------------- */

function H1({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 28, fontWeight: "900", color: "#fff" }}>
      {children}
    </Text>
  );
}

function H2({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "900", color: TEXT }}>
        {children}
      </Text>
      {right ? right : null}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: SUBTEXT, lineHeight: 19, fontWeight: "500" }}>
      {children}
    </Text>
  );
}

function CardView({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: CARD,
          borderRadius: RADIUS,
          borderWidth: 1,
          borderColor: BORDER,
          padding: spacing(2),
          ...shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: BORDER,
        marginVertical: spacing(2),
      }}
    />
  );
}

function IconPill({
  icon,
  label,
  onPress,
  selected,
  leftColor,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  leftColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? BRAND : BORDER,
          backgroundColor: selected ? "#E9F7EF" : "#fff",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? BRAND : (leftColor ?? "#F2F4F7"),
        }}
      >
        <Ionicons name={icon} size={14} color={selected ? "#fff" : "#111"} />
      </View>
      <Text style={{ fontWeight: "800", color: TEXT }}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  icon?: any;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: isDisabled ? "#9ABF9F" : BRAND,
          paddingVertical: 13,
          paddingHorizontal: 14,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function SecondaryButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: "#F2F4F7",
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: BORDER,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={TEXT} /> : null}
      <Text style={{ color: TEXT, fontWeight: "900", fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DangerButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: "#FEF3F2",
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: "#FEE4E2",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={DANGER} /> : null}
      <Text style={{ color: DANGER, fontWeight: "900", fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({
  icon,
  label,
  right,
}: {
  icon?: any;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: "#E9F7EF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={15} color={BRAND} />
          </View>
        ) : null}
        <Text style={{ fontWeight: "900", color: TEXT }}>{label}</Text>
      </View>
      {right ? right : null}
    </View>
  );
}

function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  onSubmitEditing?: () => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#98A2B3"
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? "sentences"}
      autoCorrect={autoCorrect}
      onSubmitEditing={onSubmitEditing}
      style={{
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: multiline ? 12 : 10,
        minHeight: multiline ? 92 : 44,
        color: TEXT,
        fontWeight: "600",
      }}
      textAlignVertical={multiline ? "top" : "center"}
    />
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        {
          width: 54,
          height: 32,
          borderRadius: 999,
          backgroundColor: value ? BRAND : "#D0D5DD",
          padding: 4,
          opacity: pressed ? 0.9 : 1,
          justifyContent: "center",
        },
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: "#fff",
          transform: [{ translateX: value ? 22 : 0 }],
        }}
      />
    </Pressable>
  );
}

/* ------------------------ Ingredient Picker Modal ------------------------ */

function IngredientPickerModal({
  visible,
  onClose,
  onPick,
  currentUserId,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ing: IngredientRow) => void;
  currentUserId: string | null;
}) {
  const { show, ToastHost } = useToast();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<IngredientRow[]>([]);
  const [confirmName, setConfirmName] = useState<string | null>(null);

  const canAdd = q.trim().length >= 2;

  const load = useCallback(async () => {
    const query = q.trim();
    if (!query) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id,name,created_by,emoji")
        .ilike("name", `%${query}%`)
        .order("name", { ascending: true })
        .limit(25);

      if (error) throw error;
      setItems((data ?? []) as IngredientRow[]);
    } catch (e: any) {
      show(e.message ?? "Ingredient search failed", "err");
    } finally {
      setLoading(false);
    }
  }, [q, show]);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => load(), 220);
    return () => clearTimeout(id);
  }, [q, load, visible]);

  useEffect(() => {
    if (!visible) {
      setQ("");
      setItems([]);
      setConfirmName(null);
    }
  }, [visible]);

  const addNewIngredient = useCallback(async () => {
    const name = q.trim();
    if (!name) return;
    if (!currentUserId) {
      show("Sign in to add ingredients", "warn");
      return;
    }

    setLoading(true);
    try {
      // Note: if you have strict RLS, you may need an RPC/function like web.
      const { data, error } = await supabase
        .from("ingredients")
        .insert({ name, created_by: currentUserId })
        .select("id,name,created_by,emoji")
        .single();

      if (error) throw error;

      const ing = data as IngredientRow;
      onPick(ing);
      show("Ingredient added!", "ok");
      onClose();
    } catch (e: any) {
      show(e.message ?? "Could not add ingredient", "err");
    } finally {
      setLoading(false);
      setConfirmName(null);
    }
  }, [currentUserId, onClose, onPick, q, show]);

  const deleteIngredient = useCallback(
    async (ing: IngredientRow) => {
      if (!currentUserId || ing.created_by !== currentUserId) return;
      Alert.alert(
        "Delete ingredient?",
        `Delete "${ing.name}"? This removes it from the ingredients list (not from recipes that already used it).`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from("ingredients")
                  .delete()
                  .eq("id", ing.id);

                if (error) throw error;
                setItems((p) => p.filter((x) => x.id !== ing.id));
                show("Deleted ingredient", "ok");
              } catch (e: any) {
                show(e.message ?? "Delete failed", "err");
              }
            },
          },
        ]
      );
    },
    [currentUserId, show]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <ToastHost />

        <View
          style={{
            paddingHorizontal: spacing(2),
            paddingTop: spacing(1.5),
            paddingBottom: spacing(1.5),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
            backgroundColor: "#fff",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="search-outline" size={20} color={BRAND} />
            <Text style={{ fontWeight: "900", fontSize: 16, color: TEXT }}>
              Pick ingredient
            </Text>
          </View>

          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color={TEXT} />
          </Pressable>
        </View>

        <View style={{ padding: spacing(2) }}>
          <TextField
            value={q}
            onChangeText={(t) => {
              setQ(t);
              setConfirmName(null);
            }}
            placeholder="Search ingredient… (ex: flour, soy milk)"
            autoCapitalize="none"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <View style={{ height: spacing(2) }} />

          <CardView style={{ padding: spacing(2) }}>
            <H2
              right={
                loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={{ color: SUBTEXT, fontWeight: "700" }}>
                    {items.length} results
                  </Text>
                )
              }
            >
              Results
            </H2>

            {q.trim().length === 0 ? (
              <P>Start typing to search ingredients.</P>
            ) : loading ? (
              <View style={{ paddingVertical: spacing(2) }}>
                <ActivityIndicator />
              </View>
            ) : items.length === 0 ? (
              <View style={{ gap: 10 }}>
                <P>No matches.</P>

                {!confirmName ? (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <SecondaryButton
                      label={canAdd ? `Add "${q.trim()}"` : "Type at least 2 letters"}
                      icon="add-circle-outline"
                      onPress={() => {
                        if (!canAdd) return;
                        setConfirmName(q.trim());
                      }}
                    />
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontWeight: "900", color: TEXT }}>
                      Add “{confirmName}” as a new ingredient?
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <PrimaryButton
                        label="Yes, add"
                        icon="checkmark-circle-outline"
                        onPress={addNewIngredient}
                        loading={loading}
                      />
                      <SecondaryButton
                        label="Cancel"
                        icon="close-circle-outline"
                        onPress={() => setConfirmName(null)}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {items.map((ing) => {
                  const canDelete = currentUserId && ing.created_by === currentUserId;
                  return (
                    <Pressable
                      key={ing.id}
                      onPress={() => {
                        onPick(ing);
                        onClose();
                      }}
                      style={({ pressed }) => [
                        {
                          borderWidth: 1,
                          borderColor: BORDER,
                          borderRadius: 14,
                          padding: 12,
                          backgroundColor: pressed ? "#F9FAFB" : "#fff",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        },
                      ]}
                    >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,                 // ✅ take remaining space
                            minWidth: 0,             // ✅ allows ellipsize to work on iOS
                          }}
                        >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            backgroundColor: "#E9F7EF",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>
                            {resolveIngredientEmoji(ing.name, ing.emoji)}
                          </Text>
                        </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={{ fontWeight: "900", color: TEXT }}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {ing.name}
                            </Text>

                            <Text
                              style={{ color: SUBTEXT, fontWeight: "600", marginTop: 2 }}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {canDelete ? "Created by you" : "Ingredient"}
                            </Text>
                          </View>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {canDelete ? (
                          <Pressable
                            onPress={() => deleteIngredient(ing)}
                            style={{
                              padding: 8,
                              borderRadius: 12,
                              backgroundColor: "#FEF3F2",
                              borderWidth: 1,
                              borderColor: "#FEE4E2",
                            }}
                          >
                            <Ionicons name="trash-outline" size={18} color={DANGER} />
                          </Pressable>
                        ) : null}
                        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </CardView>
        </View>
        <Pressable
          onPress={() => {}}
          style={{
            position: "absolute",
            right: 16,
            bottom: 90,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: BRAND,
            alignItems: "center",
            justifyContent: "center",
            elevation: 6,
          }}
        >
          <Ionicons name="arrow-up" size={22} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

/* ------------------------ Picker Bottom Sheet (Simple) ------------------------ */

function SimplePickerModal({
  visible,
  title,
  items,
  value,
  onPick,
  onClose,
  icon,
}: {
  visible: boolean;
  title: string;
  items: string[];
  value: string;
  onPick: (v: string) => void;
  onClose: () => void;
  icon?: any;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View
          style={{
            paddingHorizontal: spacing(2),
            paddingTop: spacing(1.5),
            paddingBottom: spacing(1.5),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
            backgroundColor: "#fff",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={icon ?? "options-outline"} size={20} color={BRAND} />
            <Text style={{ fontWeight: "900", fontSize: 16, color: TEXT }}>
              {title}
            </Text>
          </View>

          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color={TEXT} />
          </Pressable>
        </View>

        <ScrollView style={{ padding: spacing(2) }} contentContainerStyle={{ gap: 10 }}>
          {items.map((it) => {
            const selected = it === value;
            return (
              <Pressable
                key={it || "_empty"}
                onPress={() => {
                  onPick(it);
                  onClose();
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: selected ? "#E9F7EF" : "#fff",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: selected ? BRAND : BORDER,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ fontWeight: "900", color: TEXT }}>
                  {it === "" ? "None" : it}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={20} color={BRAND} />
                ) : (
                  <Ionicons name="ellipse-outline" size={18} color="#98A2B3" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ----------------------------- Main Screen ----------------------------- */

export default function CreateScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ id?: string; ts?: string }>();
  const recipeIdParam = params?.id ? String(params.id) : "";
  const editing = Boolean(recipeIdParam);

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

  const { show, ToastHost } = useToast();

  // identity
  const [userId, setUserId] = useState<string | null>(null);

  // core fields
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");

  const [servings, setServings] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("");
  const [demoUrl, setDemoUrl] = useState("");

  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // ingredients + steps
  const [lines, setLines] = useState<Line[]>([
    { position: 1, ingredient: null, quantity: "", unit_code: "", notes: "" },
  ]);
  const [steps, setSteps] = useState<Step[]>([{ position: 1, body: "" }]);

  // cover image - simplified like profile pictures
  const [coverUri, setCoverUri] = useState<string | null>(null); // local chosen URI for preview
  const [coverPath, setCoverPath] = useState<string | null>(null); // storage path

  // import
  const [importVideoUri, setImportVideoUri] = useState<string | null>(null);
  const [importVideoName, setImportVideoName] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // modals
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [ingredientTargetPos, setIngredientTargetPos] = useState<number | null>(null);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitTargetPos, setUnitTargetPos] = useState<number | null>(null);

  const [difficultyModalOpen, setDifficultyModalOpen] = useState(false);

  // saving / loading
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI expand/collapse
  const [openBasics, setOpenBasics] = useState(true);
  const [openImport, setOpenImport] = useState(true);
  const [openDetails, setOpenDetails] = useState(true);
  const [openTags, setOpenTags] = useState(true);
  const [openIngredients, setOpenIngredients] = useState(true);
  const [openSteps, setOpenSteps] = useState(true);

  // dirty tracking
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const headerTitle = editing ? "Edit Recipe" : "Create Recipe";

  /* -------------------------- Reset for new recipe -------------------------- */

  useEffect(() => {
  // When tab is re-pressed, _layout adds ?ts=..., so reset the form
  if (params?.ts && !params?.id) {
    // match your existing "new recipe reset" behavior
    setTitle("");
    setCaption("");
    setDescription("");
    setServings("");
    setPrepTime("");
    setCookTime("");
    setDifficulty("");
    setDemoUrl("");

    setIsPublic(true);
    setTags([]);

    setCoverUri(null);
    setCoverPath(null);

    setLines([{ position: 1, ingredient: null, quantity: "", unit_code: "", notes: "" }]);
    setSteps([{ position: 1, body: "" }]);

    // also clear any local pickers/search UI state if you have it
    setUnitTargetPos(null);
    setIngredientTargetPos(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [params?.ts]);


  /* -------------------------- Load user & recipe -------------------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const isImportableShareLink = (text: string) => {
    const t = text.trim();
    if (!t) return false;
    return (
      t.startsWith("http") &&
      (t.includes("tiktok.com") ||
        t.includes("instagram.com") ||
        t.includes("youtube.com") ||
        t.includes("youtu.be") ||
        t.includes("facebook.com") ||
        t.includes("fb.watch"))
    );
  };

  const applyImportedDraft = useCallback(
    (draft: any) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setTitle(draft.title ?? "");
      setCaption(draft.caption ?? "");
      setDescription(draft.description ?? "");
      setServings(draft.servings != null ? String(draft.servings) : "");
      setPrepTime(draft.prep_time ?? "");
      setCookTime(draft.cook_time ?? "");
      setDifficulty((draft.difficulty ?? "") as Difficulty);
      setTags(Array.isArray(draft.tags) ? draft.tags : []);

      const draftSteps = Array.isArray(draft.steps) ? draft.steps : [];
      setSteps(
        draftSteps.length
          ? draftSteps.map((s: any, i: number) => ({
              position: i + 1,
              body: s.body ?? "",
            }))
          : [{ position: 1, body: "" }]
      );

      const draftIngredients = Array.isArray(draft.ingredients)
        ? draft.ingredients
        : [];
      setLines(
        draftIngredients.length
          ? draftIngredients.map((ing: any, i: number) => ({
              position: i + 1,
              ingredient: ing.ingredient_id
                ? {
                    id: Number(ing.ingredient_id),
                    name: ing.name ?? "Ingredient",
                    created_by: null,
                  }
                : ing.name
                ? {
                    // fallback: unknown id, so keep null but store name is hard
                    // We'll place it as "ingredient null" so user can pick manually.
                    id: -1,
                    name: ing.name ?? "Ingredient",
                    created_by: null,
                  }
                : null,
              quantity: ing.quantity != null ? String(ing.quantity) : "",
              unit_code: ing.unit ?? "",
              notes: ing.notes ?? "",
            }))
          : [{ position: 1, ingredient: null, quantity: "", unit_code: "", notes: "" }]
      );

      markDirty();
    },
    [markDirty]
  );

  const importFromVideoUrl = useCallback(async () => {
    if (!API_BASE) {
      show("Missing EXPO_PUBLIC_API_BASE_URL", "err");
      return;
    }
    const url = importUrl.trim();
    if (!url) {
      show("Paste a link first", "warn");
      return;
    }

    setImporting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180_000);

    try {
      const res = await fetch(`${API_BASE}/video-import-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Link import failed");
      }

      const draft = await res.json();
      applyImportedDraft(draft);
      show("Imported from link! Review + edit before saving.", "ok");
    } catch (e: any) {
      if (e?.name === "AbortError") show("Import timed out. Try again.", "warn");
      else show(e.message ?? "Import failed", "err");
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  }, [API_BASE, applyImportedDraft, importUrl, show]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function checkClipboardForShareLink() {
        try {
          const text = await Clipboard.getStringAsync();
          if (cancelled) return;
          if (!isImportableShareLink(text)) return;

          // If the user already pasted something in the import box, don't annoy them
          if (importUrl.trim().length > 0) return;

          Alert.alert(
            "Import recipe from link?",
            "We found a recipe video link in your clipboard. Import it into this recipe draft?",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Import",
                onPress: () => {
                  // fill the box for UI transparency
                  setImportUrl(text.trim());

                  // then trigger existing importer
                  // (this calls your backend /video-import-url)
                  setTimeout(() => {
                    importFromVideoUrl();
                  }, 50);
                },
              },
            ]
          );
        } catch (e) {
          // silent fail
        }
      }

      checkClipboardForShareLink();

      return () => {
        cancelled = true;
      };
    }, [importFromVideoUrl, importUrl])
  );


  useEffect(() => {
    let alive = true;

    async function loadIfEditing() {
      setInitialLoading(true);
      try {
        if (!editing || !recipeIdParam) return;

        const recipeId = Number(recipeIdParam);
        if (!Number.isFinite(recipeId)) return;

        // recipe core
        const { data: rec, error: recErr } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", recipeId)
          .single();

        if (recErr) throw recErr;
        if (!rec) return;

        if (!alive) return;

        setTitle(rec.title ?? "");
        setCaption(rec.caption ?? "");
        setDescription(rec.description ?? "");
        setServings(rec.servings != null ? String(rec.servings) : "");
        setIsPublic(Boolean(rec.is_public));
        setTags(Array.isArray(rec.tags) ? rec.tags : rec.tags ?? []);

        setPrepTime(rec.prep_time ?? "");
        setCookTime(rec.cook_time ?? "");
        setDifficulty((rec.difficulty ?? "") as Difficulty);
        setDemoUrl(rec.demo_url ?? "");

        if (rec.image_url) setCoverPath(rec.image_url);

        // ingredients join
        const { data: ing, error: ingErr } = await supabase
          .from("recipe_ingredients")
          .select("position,quantity,unit_code,notes,ingredients(id,name,created_by)")
          .eq("recipe_id", recipeId)
          .order("position", { ascending: true });

        if (ingErr) throw ingErr;

        if (!alive) return;

        if (ing && ing.length) {
          setLines(
            ing.map((r: any, idx: number) => ({
              position: idx + 1,
              ingredient: r.ingredients
                ? {
                    id: r.ingredients.id,
                    name: r.ingredients.name,
                    created_by: r.ingredients.created_by,
                    emoji: r.ingredients.emoji,
                  }
                : null,
              quantity: r.quantity != null ? String(r.quantity) : "",
              unit_code: r.unit_code ?? "",
              notes: r.notes ?? "",
            }))
          );
        }

        // steps
        const { data: st, error: stErr } = await supabase
          .from("recipe_steps")
          .select("position,body")
          .eq("recipe_id", recipeId)
          .order("position", { ascending: true });

        if (stErr) throw stErr;

        if (!alive) return;

        if (st && st.length) {
          setSteps(
            st.map((s: any, idx: number) => ({
              position: idx + 1,
              body: s.body ?? "",
            }))
          );
        }

        dirtyRef.current = false;
      } catch (e: any) {
        show(e.message ?? "Failed to load recipe", "err");
      } finally {
        if (alive) setInitialLoading(false);
      }
    }


    loadIfEditing();
    if (!editing) {
      setInitialLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [editing, recipeIdParam, show]);


  useEffect(() => {
    if (editing) return;

    // core fields
    setTitle("");
    setCaption("");
    setDescription("");
    setServings("");
    setPrepTime("");
    setCookTime("");
    setDifficulty("");
    setDemoUrl("");

    // visibility + tags
    setIsPublic(false);
    setTags([]);

    // ingredients + steps
    setLines([
      { position: 1, ingredient: null, quantity: "", unit_code: "", notes: "" },
    ]);
    setSteps([{ position: 1, body: "" }]);

    // cover image
    setCoverUri(null);
    setCoverPath(null);

    // import state
    setImportVideoUri(null);
    setImportVideoName(null);
    setImportUrl("");

    // UI state
    setOpenBasics(true);
    setOpenImport(true);
    setOpenDetails(true);
    setOpenTags(true);
    setOpenIngredients(true);
    setOpenSteps(true);

    // dirty flag
    dirtyRef.current = false;
  }, [editing]);


  /* -------------------------- Leave guard (basic) -------------------------- */

  const confirmLeave = useCallback(
    (next: () => void) => {
      if (!dirtyRef.current) return next();

      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => next(),
          },
        ]
      );
    },
    []
  );

  const goBackOrHome = useCallback(() => {
    confirmLeave(() => {
      // go to Me tab (or wherever makes sense)
      router.push("/tabs/me");
    });
  }, [confirmLeave]);

  /* -------------------------- Cover image logic -------------------------- */

  const coverPreviewUrl = useMemo(() => {
    if (coverUri) return coverUri;
    return resolveImageUrl("recipe-media", coverPath);
  }, [coverUri, coverPath]);

  const pickCoverImage = useCallback(async () => {
    markDirty();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      show("Photo permission needed to pick a cover image", "warn");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (res.canceled) return;

    const img = res.assets?.[0] ?? null;
    if (!img) return;

    // Just store the local URI for now, upload during save like profile pictures
    setCoverUri(img.uri);
    show("Cover image selected", "ok");
  }, [markDirty, show]);

  const removeCover = useCallback(() => {
    markDirty();
    setCoverUri(null);
    setCoverPath(null);
    show("Cover removed", "ok");
  }, [markDirty, show]);

  /* -------------------------- Video pick + AI Import -------------------------- */

  const pickImportVideo = useCallback(async () => {
    markDirty();

    const video = await pickMedia("video"); // <-- uses camera roll
    if (!video?.uri) return;

    setImportVideoUri(video.uri);
    setImportVideoName(video.name ?? niceFileName(video.uri, "video"));
    show("Video selected from camera roll. Ready to import.", "ok");
  }, [markDirty, show]);

  const importFromVideoFile = useCallback(async () => {
    if (!API_BASE) {
      show("Missing EXPO_PUBLIC_API_BASE_URL", "err");
      return;
    }
    if (!importVideoUri) {
      show("Pick a video first", "warn");
      return;
    }

    setImporting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180_000);

    try {
      const name = importVideoName ?? "video.mp4";
      const ext = name.includes(".") ? name.split(".").pop() : "mp4";

      const form = new FormData();
      form.append("video", {
        uri: importVideoUri,
        name: name,
        type: `video/${ext}`,
      } as any);

      const res = await fetch(`${API_BASE}/video-import`, {
        method: "POST",
        body: form,
        signal: controller.signal,
        // DO NOT set Content-Type; fetch sets boundary automatically
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Video import failed");
      }

      const draft = await res.json();
      applyImportedDraft(draft);
      show("Imported from video! Review + edit before saving.", "ok");
    } catch (e: any) {
      if (e?.name === "AbortError") show("Import timed out. Try again.", "warn");
      else show(e.message ?? "Import failed", "err");
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  }, [API_BASE, applyImportedDraft, importVideoName, importVideoUri, show]);

  /* -------------------------- Tags logic -------------------------- */

  const toggleTag = useCallback(
    (t: string) => {
      markDirty();
      setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    },
    [markDirty]
  );

  /* -------------------------- Ingredient actions -------------------------- */

  const openIngredientPickerFor = useCallback((pos: number) => {
    setIngredientTargetPos(pos);
    setIngredientModalOpen(true);
  }, []);

  const onPickIngredient = useCallback(
    (ing: IngredientRow) => {
      const pos = ingredientTargetPos;
      if (!pos) return;

      markDirty();
      setLines((prev) =>
        prev.map((l) =>
          l.position === pos
            ? {
                ...l,
                // If import draft created id=-1, replace it properly
                ingredient: { id: ing.id, name: ing.name, created_by: ing.created_by, emoji: ing.emoji },
              }
            : l
        )
      );
    },
    [ingredientTargetPos, markDirty]
  );

  const setLineField = useCallback(
    (pos: number, patch: Partial<Line>) => {
      markDirty();
      setLines((prev) => prev.map((l) => (l.position === pos ? { ...l, ...patch } : l)));
    },
    [markDirty]
  );

  const addIngredientLine = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    markDirty();
    setLines((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        ingredient: null,
        quantity: "",
        unit_code: "",
        notes: "",
      },
    ]);
  }, [markDirty]);

  const removeIngredientLine = useCallback(
    (pos: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      markDirty();
      setLines((prev) =>
        prev
          .filter((l) => l.position !== pos)
          .map((l, idx) => ({ ...l, position: idx + 1 }))
      );
    },
    [markDirty]
  );

  const moveIngredient = useCallback(
    (pos: number, dir: -1 | 1) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      markDirty();
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.position === pos);
        if (idx < 0) return prev;
        const next = clamp(idx + dir, 0, prev.length - 1);
        const moved = moveItem(prev, idx, next).map((l, i) => ({ ...l, position: i + 1 }));
        return moved;
      });
    },
    [markDirty]
  );

  const openUnitPickerFor = useCallback((pos: number) => {
    setUnitTargetPos(pos);
    setUnitModalOpen(true);
  }, []);

  const onPickUnit = useCallback(
    (unit: string) => {
      const pos = unitTargetPos;
      if (!pos) return;
      setLineField(pos, { unit_code: unit });
    },
    [setLineField, unitTargetPos]
  );

  /* -------------------------- Step actions -------------------------- */

  const setStepBody = useCallback(
    (pos: number, body: string) => {
      markDirty();
      setSteps((prev) => prev.map((s) => (s.position === pos ? { ...s, body } : s)));
    },
    [markDirty]
  );

  const addStep = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    markDirty();
    setSteps((prev) => [...prev, { position: prev.length + 1, body: "" }]);
  }, [markDirty]);

  const removeStep = useCallback(
    (pos: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      markDirty();
      setSteps((prev) =>
        prev
          .filter((s) => s.position !== pos)
          .map((s, idx) => ({ ...s, position: idx + 1 }))
      );
    },
    [markDirty]
  );

  const moveStep = useCallback(
    (pos: number, dir: -1 | 1) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      markDirty();
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.position === pos);
        if (idx < 0) return prev;
        const next = clamp(idx + dir, 0, prev.length - 1);
        const moved = moveItem(prev, idx, next).map((s, i) => ({ ...s, position: i + 1 }));
        return moved;
      });
    },
    [markDirty]
  );

  /* -------------------------- Collapsible sections -------------------------- */

  const toggleSection = useCallback((setter: (v: boolean) => void, current: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(!current);
  }, []);

  /* -------------------------- Validation -------------------------- */

  const validate = useCallback(() => {
    if (!title.trim()) {
      show("Title is required.", "warn");
      return false;
    }
    if (isPublic && !coverUri && !coverPath) {
      show("Public recipes must include a cover image.", "warn");
      return false;
    }
    if (servings.trim()) {
      const n = Number(servings);
      if (!Number.isFinite(n) || n <= 0) {
        show("Servings must be a positive number.", "warn");
        return false;
      }
    }
    if (!timeLooksOk(prepTime)) {
      show("Prep time must start with a number (ex: 20 min, 1 hr).", "warn");
      return false;
    }
    if (!timeLooksOk(cookTime)) {
      show("Cook time must start with a number (ex: 30 min, 45 minutes).", "warn");
      return false;
    }
    for (const l of lines) {
      const raw = (l.quantity ?? "").trim();
      if (!raw) continue;

      const parsed = parseQuantityToNumber(raw);
      if (parsed == null) {
        show(`Invalid quantity: "${raw}". Use 0.5, 1/2, or 1 1/2.`, "warn");
        return false;
      }
    }

    return true;
  }, [cookTime, coverUri, coverPath, isPublic, prepTime, servings, show, title]);

  /* -------------------------- Save logic -------------------------- */

  const uploadCoverIfNeeded = useCallback(
    async (uid: string, recipeId: number) => {
      // If we have a new cover URI, upload it now
      if (coverUri) {
        try {
          const response = await fetch(coverUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
          const buffer = await response.arrayBuffer();
          const path = `${uid}/recipes/${recipeId}/cover_${Date.now()}.jpg`;

          const { error: upErr } = await supabase.storage
            .from("recipe-media")
            .upload(path, buffer, { 
              upsert: true,
              contentType: "image/jpeg",
            });

          if (upErr) throw upErr;
          return path;
        } catch (e: any) {
          console.error("Error uploading cover:", e);
          throw e;
        }
      }

      // No new cover to upload, return existing path
      return coverPath ?? null;
    },
    [coverUri, coverPath]
  );

  const saveRecipe = useCallback(async () => {
    if (saving) return;
    Keyboard.dismiss();

    if (!validate()) return;

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        show("Sign in first", "warn");
        return;
      }

      const recipeId = editing ? Number(recipeIdParam) : null;

      // 1) upsert recipe core
      let finalRecipeId: number;

      if (editing && recipeId && Number.isFinite(recipeId)) {
        const { error } = await supabase
          .from("recipes")
          .update({
            title: title.trim(),
            caption: caption.trim() || null,
            description: description.trim() || null,
            servings: servings.trim() ? Number(servings.trim()) : null,
            is_public: isPublic,
            tags,
            prep_time: prepTime.trim() || null,
            cook_time: cookTime.trim() || null,
            difficulty: difficulty || null,
            demo_url: demoUrl.trim() || null,
          })
          .eq("id", recipeId);

        if (error) throw error;

        finalRecipeId = recipeId;

        // delete old steps + ingredients
        const { error: delStepsErr } = await supabase
          .from("recipe_steps")
          .delete()
          .eq("recipe_id", finalRecipeId);

        if (delStepsErr) throw delStepsErr;

        const { error: delIngErr } = await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", finalRecipeId);

        if (delIngErr) throw delIngErr;
      } else {
        const { data: rec, error } = await supabase
          .from("recipes")
          .insert({
            user_id: uid,
            title: title.trim(),
            caption: caption.trim() || null,
            description: description.trim() || null,
            servings: servings.trim() ? Number(servings.trim()) : null,
            is_public: isPublic,
            tags,
            prep_time: prepTime.trim() || null,
            cook_time: cookTime.trim() || null,
            difficulty: difficulty || null,
            demo_url: demoUrl.trim() || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        finalRecipeId = rec!.id;
      }

      // 2) cover upload (if chosen) and update image_url
      const coverPath = await uploadCoverIfNeeded(uid, finalRecipeId);

      // If user removed cover: coverPath may be null
      const { error: coverUpdateErr } = await supabase
        .from("recipes")
        .update({ image_url: coverPath })
        .eq("id", finalRecipeId);

      if (coverUpdateErr) throw coverUpdateErr;

      // 3) ingredients insert
      const ingRows = lines
        .filter((l) => l.ingredient && l.ingredient.id && l.ingredient.id > 0)
        .map((l, idx) => ({
          recipe_id: finalRecipeId,
          ingredient_id: l.ingredient!.id,
          quantity: parseQuantityToNumber(l.quantity) ?? null,
          unit_code: l.unit_code || null,
          notes: l.notes.trim() || null,
          position: idx + 1,
        }));

      if (ingRows.length) {
        const { error } = await supabase.from("recipe_ingredients").insert(ingRows);
        if (error) throw error;
      }

      // 4) steps insert
      const stepRows = steps
        .map((s, idx) => ({
          recipe_id: finalRecipeId,
          position: idx + 1,
          body: s.body.trim(),
        }))
        .filter((s) => s.body.length > 0);

      if (stepRows.length) {
        const { error } = await supabase.from("recipe_steps").insert(stepRows);
        if (error) throw error;
      }

      dirtyRef.current = false;

      show(editing ? "Recipe updated!" : "Recipe created!", "ok");

      // go to Me tab so user sees it
      setTimeout(() => {
        router.push("/tabs/me");
      }, 600);
    } catch (e: any) {
      show(e.message ?? "Save failed", "err");
    } finally {
      setSaving(false);
    }
  }, [
    caption,
    demoUrl,
    description,
    difficulty,
    editing,
    coverPath,
    isPublic,
    lines,
    prepTime,
    recipeIdParam,
    servings,
    show,
    steps,
    tags,
    title,
    uploadCoverIfNeeded,
    validate,
    saving,
  ]);

  /* -------------------------- Delete recipe -------------------------- */

  const deleteRecipe = useCallback(async () => {
    if (!editing) return;
    const idNum = Number(recipeIdParam);
    if (!Number.isFinite(idNum)) return;

    Alert.alert("Delete recipe?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);

            // delete steps + ingredients first (safety)
            const { error: stErr } = await supabase
              .from("recipe_steps")
              .delete()
              .eq("recipe_id", idNum);
            if (stErr) throw stErr;

            const { error: ingErr } = await supabase
              .from("recipe_ingredients")
              .delete()
              .eq("recipe_id", idNum);
            if (ingErr) throw ingErr;

            const { error: recErr } = await supabase
              .from("recipes")
              .delete()
              .eq("id", idNum);
            if (recErr) throw recErr;

            dirtyRef.current = false;
            show("Deleted recipe", "ok");
            setTimeout(() => router.push("/tabs/me"), 450);
          } catch (e: any) {
            show(e.message ?? "Delete failed", "err");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [editing, recipeIdParam, show]);

  /* -------------------------- Top banner stats -------------------------- */

  const tagCount = tags.length;
  const ingredientCount = lines.filter((l) => l.ingredient?.id && l.ingredient.id > 0).length;
  const stepCount = steps.filter((s) => s.body.trim().length > 0).length;

  /* -------------------------- Render -------------------------- */

  if (initialLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[BRAND, BRAND_DARK]}
          style={{
            paddingTop: spacing(4),
            paddingBottom: spacing(3),
            paddingHorizontal: spacing(2),
          }}
        >
          <H1>{headerTitle}</H1>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "700", marginTop: 8 }}>
            Loading recipe…
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <ToastHost />

      {/* ingredient modal */}
      <IngredientPickerModal
        visible={ingredientModalOpen}
        onClose={() => setIngredientModalOpen(false)}
        onPick={onPickIngredient}
        currentUserId={userId}
      />

      {/* unit picker */}
      <SimplePickerModal
        visible={unitModalOpen}
        title="Select unit"
        icon="pricetag-outline"
        items={UNITS}
        value={unitTargetPos ? (lines.find((l) => l.position === unitTargetPos)?.unit_code ?? "") : ""}
        onPick={onPickUnit}
        onClose={() => setUnitModalOpen(false)}
      />

      {/* difficulty picker */}
      <SimplePickerModal
        visible={difficultyModalOpen}
        title="Difficulty"
        icon="bar-chart-outline"
        items={["", "Easy", "Medium", "Hard"]}
        value={difficulty}
        onPick={(v) => {
          markDirty();
          setDifficulty(v as Difficulty);
        }}
        onClose={() => setDifficultyModalOpen(false)}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing(8) }}
        >
          {/* Header */}
          <LinearGradient
            colors={[BRAND, BRAND_DARK]}
            style={{
              paddingTop: spacing(4),
              paddingBottom: spacing(3),
              paddingHorizontal: spacing(2),
              borderBottomLeftRadius: 26,
              borderBottomRightRadius: 26,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <H1>{headerTitle}</H1>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: "700",
                    marginTop: 8,
                  }}
                >
                  {editing
                    ? "Update your recipe with clean details + media."
                    : "Build a clean recipe card like your web version."}
                </Text>
              </View>

              <Pressable
                onPress={goBackOrHome}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 12,
                }}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            {/* quick stats pills */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: spacing(2),
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.16)",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="pricetag-outline" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900" }}>{tagCount} tags</Text>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.16)",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="cart-outline" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {ingredientCount} ingredients
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.16)",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="list-outline" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900" }}>{stepCount} steps</Text>
              </View>

              <View
                style={{
                  backgroundColor: isPublic ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.10)",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderWidth: 1,
                  borderColor: isPublic ? "rgba(255,255,255,0.35)" : "transparent",
                }}
              >
                <Ionicons name={isPublic ? "globe-outline" : "lock-closed-outline"} size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {isPublic ? "Public" : "Private"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={{ padding: spacing(2), gap: 16 }}>
            {/* BASICS */}
            <CardView>
              <H2
                right={
                  <Pressable
                    onPress={() => toggleSection(setOpenBasics, openBasics)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={openBasics ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={SUBTEXT}
                    />
                  </Pressable>
                }
              >
                Basics
              </H2>

              {openBasics ? (
                <View style={{ gap: 14 }}>
                  <View>
                    <FieldLabel icon="create-outline" label="Title *" />
                    <TextField
                      value={title}
                      onChangeText={(t) => {
                        markDirty();
                        setTitle(t);
                      }}
                      placeholder="Ex: Vegan Brownies"
                    />
                  </View>

                  <View>
                    <FieldLabel icon="sparkles-outline" label="Caption" />
                    <TextField
                      value={caption}
                      onChangeText={(t) => {
                        markDirty();
                        setCaption(t);
                      }}
                      placeholder="Short one-liner (shows on feed card)"
                    />
                  </View>

                  <View>
                    <FieldLabel icon="document-text-outline" label="Description" />
                    <TextField
                      value={description}
                      onChangeText={(t) => {
                        markDirty();
                        setDescription(t);
                      }}
                      placeholder="Full description (optional)"
                      multiline
                    />
                  </View>
                </View>
              ) : null}
            </CardView>

            {/* IMPORT */}
            <CardView>
              <H2
                right={
                  <Pressable
                    onPress={() => toggleSection(setOpenImport, openImport)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={openImport ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={SUBTEXT}
                    />
                  </Pressable>
                }
              >
                Import with AI
              </H2>

              {openImport ? (
                <View style={{ gap: 12 }}>
                  <View
                    style={{
                      backgroundColor: "#E9F7EF",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: "#D1FADF",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Ionicons name="sparkles" size={18} color={BRAND} />
                    <Text style={{ fontWeight: "800", color: BRAND, flex: 1 }}>
                      Import fills everything — you still edit & save.
                    </Text>
                  </View>

                  {/* Import from video file */}
                  <CardView style={{ padding: 14, backgroundColor: "#fff" }}>
                    <H2
                      right={
                        <Ionicons name="videocam-outline" size={18} color={SUBTEXT} />
                      }
                    >
                      Import from Video File
                    </H2>
                    <P>Pick a cooking video from your phone → AI extracts recipe.</P>

                    <View style={{ height: 12 }} />

                    <View style={{ gap: 10 }}>
                      <SecondaryButton
                        label={importVideoName ? `Selected: ${importVideoName}` : "Pick a video"}
                        icon="folder-open-outline"
                        onPress={pickImportVideo}
                      />

                      <PrimaryButton
                        label={importing ? "Importing…" : "Import from video"}
                        icon="sparkles-outline"
                        onPress={importFromVideoFile}
                        loading={importing}
                        disabled={!importVideoUri}
                      />

                      <Text style={{ color: SUBTEXT, fontWeight: "600" }}>
                        Tip: shorter + clear videos import best.
                      </Text>
                    </View>
                  </CardView>
                  
                  {/* Import from URL */}
                  <CardView style={{ padding: 14, backgroundColor: "#fff" }}>
                    <H2 right={<Ionicons name="link-outline" size={18} color={SUBTEXT} />}>
                      Import from Link
                    </H2>
                    <P>Paste YouTube / Instagram / TikTok link.</P>

                    <View style={{ height: 12 }} />

                    <TextField
                      value={importUrl}
                      onChangeText={(t) => {
                        markDirty();
                        setImportUrl(t);
                      }}
                      placeholder="https://youtube.com/…"
                      autoCapitalize="none"
                      keyboardType="url"
                    />

                    <View style={{ height: 10 }} />

                    <PrimaryButton
                      label={importing ? "Importing…" : "Import from link"}
                      icon="sparkles-outline"
                      onPress={importFromVideoUrl}
                      loading={importing}
                      disabled={!importUrl.trim()}
                    />

                    {!API_BASE ? (
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ color: DANGER, fontWeight: "800" }}>
                          Missing EXPO_PUBLIC_API_BASE_URL
                        </Text>
                        <Text style={{ color: SUBTEXT, fontWeight: "600", marginTop: 4 }}>
                          Add it to your env so import endpoints work.
                        </Text>
                      </View>
                    ) : null}
                  </CardView>
                </View> 
              ) : null}
            </CardView>

            {/* DETAILS */}
            <CardView>
              <H2
                right={
                  <Pressable
                    onPress={() => toggleSection(setOpenDetails, openDetails)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={openDetails ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={SUBTEXT}
                    />
                  </Pressable>
                }
              >
                Details
              </H2>

              {openDetails ? (
                <View style={{ gap: 14 }}>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <FieldLabel icon="people-outline" label="Servings" />
                      <TextField
                        value={servings}
                        onChangeText={(t) => {
                          markDirty();
                          // allow only numbers (soft)
                          if (t === "") return setServings("");
                          if (/^\d+$/.test(t)) setServings(t);
                        }}
                        placeholder="ex: 4"
                        keyboardType="numeric"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <FieldLabel icon="bar-chart-outline" label="Difficulty" />
                      <Pressable
                        onPress={() => setDifficultyModalOpen(true)}
                        style={({ pressed }) => [
                          {
                            borderWidth: 1,
                            borderColor: BORDER,
                            backgroundColor: "#fff",
                            borderRadius: 14,
                            paddingHorizontal: 12,
                            height: 44,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <Text style={{ color: difficulty ? TEXT : "#98A2B3", fontWeight: "700" }}>
                          {difficulty || "Select…"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={SUBTEXT} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <FieldLabel icon="time-outline" label="Prep Time" />
                      <TextField
                        value={prepTime}
                        onChangeText={(t) => {
                          markDirty();
                          setPrepTime(t);
                        }}
                        placeholder="ex: 20 min"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <FieldLabel icon="flame-outline" label="Cook Time" />
                      <TextField
                        value={cookTime}
                        onChangeText={(t) => {
                          markDirty();
                          setCookTime(t);
                        }}
                        placeholder="ex: 30 min"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View>
                    <FieldLabel icon="play-circle-outline" label="Demo Video (optional)" />
                    <TextField
                      value={demoUrl}
                      onChangeText={(t) => {
                        markDirty();
                        setDemoUrl(t);
                      }}
                      placeholder="YouTube / Instagram / TikTok link…"
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                    <View style={{ height: 8 }} />
                    <Text style={{ color: SUBTEXT, fontWeight: "600" }}>
                      This link can show on the recipe page as a demo.
                    </Text>
                  </View>

                  <Divider />

                  {/* Public toggle + cover image */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    {/* Left content MUST be flex:1 so it can shrink instead of pushing toggle away */}
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 14,
                          backgroundColor: isPublic ? "#E9F7EF" : "#F2F4F7",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={isPublic ? "globe-outline" : "lock-closed-outline"}
                          size={18}
                          color={isPublic ? BRAND : SUBTEXT}
                        />
                      </View>

                      {/* Text container MUST shrink/wrap */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: "900", color: TEXT }} numberOfLines={1}>
                          Public recipe
                        </Text>
                        <Text
                          style={{ color: SUBTEXT, fontWeight: "600", marginTop: 2 }}
                          numberOfLines={2}
                        >
                          Public recipes show in Discover/Feed.
                        </Text>
                      </View>
                    </View>

                    {/* Toggle should NEVER shrink */}
                    <View style={{ flexShrink: 0, paddingTop: 2 }}>
                      <Toggle
                        value={isPublic}
                        onChange={(v) => {
                          markDirty();
                          setIsPublic(v);
                        }}
                      />
                    </View>
                  </View>


                  <View style={{ height: 10 }} />

                  <CardView style={{ padding: 14 }}>
                    <H2 right={<Ionicons name="image-outline" size={18} color={SUBTEXT} />}>
                      Cover Image
                    </H2>
                    <P>Cover image is required for public recipes.</P>

                    <View style={{ height: 12 }} />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <SecondaryButton
                        label={coverPreviewUrl ? "Change cover" : "Pick cover image"}
                        icon="images-outline"
                        onPress={pickCoverImage}
                      />
                      {coverPreviewUrl ? (
                        <DangerButton
                          label="Remove"
                          icon="trash-outline"
                          onPress={removeCover}
                        />
                      ) : null}
                    </View>

                    {coverPreviewUrl ? (
                      <View style={{ marginTop: 12 }}>
                        <Image
                          source={{ uri: coverPreviewUrl }}
                          style={{
                            width: "100%",
                            height: 220,
                            borderRadius: 16,
                            backgroundColor: "#F2F4F7",
                          }}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View
                        style={{
                          marginTop: 12,
                          borderWidth: 1,
                          borderColor: BORDER,
                          borderRadius: 16,
                          padding: 14,
                          backgroundColor: "#FAFAFA",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Ionicons name="information-circle-outline" size={18} color={SUBTEXT} />
                        <Text style={{ color: SUBTEXT, fontWeight: "700", flex: 1 }}>
                          No cover selected yet.
                        </Text>
                      </View>
                    )}
                  </CardView>
                </View>
              ) : null}
            </CardView>

            {/* TAGS */}
            <CardView>
              <H2
                right={
                  <Pressable
                    onPress={() => toggleSection(setOpenTags, openTags)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={openTags ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={SUBTEXT}
                    />
                  </Pressable>
                }
              >
                Tags
              </H2>

              {openTags ? (
                <View style={{ gap: 12 }}>
                  <P>Tap tags to add/remove. These power filtering/search.</P>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {TAG_OPTIONS.map((t) => {
                      const selected = tags.includes(t.label);
                      return (
                        <IconPill
                          key={t.label}
                          icon={t.icon}
                          label={t.label}
                          selected={selected}
                          onPress={() => toggleTag(t.label)}
                        />
                      );
                    })}
                  </View>

                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 14,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: BORDER,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: SUBTEXT, fontWeight: "800" }}>
                      Selected
                    </Text>
                    <Text style={{ color: TEXT, fontWeight: "900" }}>
                      {tags.length ? tags.join(", ") : "None"}
                    </Text>
                  </View>
                </View>
              ) : null}
            </CardView>

            {/* INGREDIENTS */}
            <CardView>
              <H2
                right={
                  <Pressable
                    onPress={() => toggleSection(setOpenIngredients, openIngredients)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={openIngredients ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={SUBTEXT}
                    />
                  </Pressable>
                }
              >
                Ingredients
              </H2>

              {openIngredients ? (
                <View style={{ gap: 12 }}>
                  <P>Tap ingredient to search. Add qty + units for clean grocery math.</P>

                  {lines.map((l) => {
                    const canMoveUp = l.position > 1;
                    const canMoveDown = l.position < lines.length;

                    return (
                      <CardView key={l.position} style={{ padding: 14, backgroundColor: "#fff" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontWeight: "900", color: TEXT }}>
                            {l.position}.
                          </Text>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Pressable
                              disabled={!canMoveUp}
                              onPress={() => moveIngredient(l.position, -1)}
                              style={{
                                opacity: canMoveUp ? 1 : 0.3,
                                padding: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: BORDER,
                                backgroundColor: "#fff",
                              }}
                            >
                              <Ionicons name="arrow-up-outline" size={18} color={TEXT} />
                            </Pressable>

                            <Pressable
                              disabled={!canMoveDown}
                              onPress={() => moveIngredient(l.position, 1)}
                              style={{
                                opacity: canMoveDown ? 1 : 0.3,
                                padding: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: BORDER,
                                backgroundColor: "#fff",
                              }}
                            >
                              <Ionicons name="arrow-down-outline" size={18} color={TEXT} />
                            </Pressable>

                            <Pressable
                              onPress={() => removeIngredientLine(l.position)}
                              style={{
                                padding: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#FEE4E2",
                                backgroundColor: "#FEF3F2",
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color={DANGER} />
                            </Pressable>
                          </View>
                        </View>

                        <View style={{ height: 10 }} />

                        {/* ingredient picker row */}
                        <Pressable
                          onPress={() => openIngredientPickerFor(l.position)}
                          style={({ pressed }) => [
                            {
                              borderWidth: 1,
                              borderColor: BORDER,
                              backgroundColor: "#fff",
                              borderRadius: 14,
                              paddingHorizontal: 12,
                              paddingVertical: 12,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                backgroundColor: "#E9F7EF",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ fontSize: 18 }}>
                                {l.ingredient
                                  ? resolveIngredientEmoji(l.ingredient.name, (l.ingredient as any).emoji)
                                  : "🧺"}
                              </Text>
                            </View>

                            <Text style={{ fontWeight: "900", color: l.ingredient ? TEXT : "#98A2B3", flex: 1 }}>
                              {l.ingredient?.name ?? "Search or add ingredient…"}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                        </Pressable>

                        <View style={{ height: 10 }} />

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <FieldLabel label="Qty" icon="calculator-outline" />
                            <TextField
                              value={l.quantity}
                              onChangeText={(t) => {
                                markDirty();

                                const cleaned = sanitizeQuantityInput(t);

                                // allow partial valid states so "/" and " " work
                                if (!isValidQuantityWhileTyping(cleaned)) return;

                                // prevent leading zeros like "00" (optional polish)
                                // keep "0.5" allowed
                                const normalized =
                                  /^0\d+$/.test(cleaned) ? String(Number(cleaned)) : cleaned;

                                setLineField(l.position, { quantity: normalized });
                              }}

                              placeholder="ex: 1/2 or 0.5"
                              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                              autoCorrect={false}
                              autoCapitalize="none"
                            />
                          </View>

                          <View style={{ width: 120 }}>
                            <FieldLabel label="Unit" icon="pricetag-outline" />
                            <Pressable
                              onPress={() => openUnitPickerFor(l.position)}
                              style={({ pressed }) => [
                                {
                                  borderWidth: 1,
                                  borderColor: BORDER,
                                  backgroundColor: "#fff",
                                  borderRadius: 14,
                                  paddingHorizontal: 12,
                                  height: 44,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  opacity: pressed ? 0.9 : 1,
                                },
                              ]}
                            >
                              <Text style={{ color: l.unit_code ? TEXT : "#98A2B3", fontWeight: "800" }}>
                                {l.unit_code || "unit"}
                              </Text>
                              <Ionicons name="chevron-down" size={18} color={SUBTEXT} />
                            </Pressable>
                          </View>
                        </View>

                        <View style={{ height: 10 }} />

                        <View>
                          <FieldLabel icon="chatbox-outline" label="Notes (optional)" />
                          <TextField
                            value={l.notes}
                            onChangeText={(t) => setLineField(l.position, { notes: t })}
                            placeholder="ex: finely chopped, room temp"
                            autoCapitalize="sentences"
                          />
                        </View>
                      </CardView>
                    );
                  })}

                  <SecondaryButton
                    label="Add ingredient"
                    icon="add-circle-outline"
                    onPress={addIngredientLine}
                  />
                </View>
              ) : null}
            </CardView>

            {/* STEPS */}
            <CardView>
              <H2
                right={
                  <Pressable
                    onPress={() => toggleSection(setOpenSteps, openSteps)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={openSteps ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={SUBTEXT}
                    />
                  </Pressable>
                }
              >
                Steps
              </H2>

              {openSteps ? (
                <View style={{ gap: 12 }}>
                  <P>Write the steps like a creator post. Keep it clean.</P>

                  {steps.map((s) => {
                    const canMoveUp = s.position > 1;
                    const canMoveDown = s.position < steps.length;

                    return (
                      <CardView key={s.position} style={{ padding: 14, backgroundColor: "#fff" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontWeight: "900", color: TEXT }}>
                            Step {s.position}
                          </Text>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Pressable
                              disabled={!canMoveUp}
                              onPress={() => moveStep(s.position, -1)}
                              style={{
                                opacity: canMoveUp ? 1 : 0.3,
                                padding: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: BORDER,
                                backgroundColor: "#fff",
                              }}
                            >
                              <Ionicons name="arrow-up-outline" size={18} color={TEXT} />
                            </Pressable>

                            <Pressable
                              disabled={!canMoveDown}
                              onPress={() => moveStep(s.position, 1)}
                              style={{
                                opacity: canMoveDown ? 1 : 0.3,
                                padding: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: BORDER,
                                backgroundColor: "#fff",
                              }}
                            >
                              <Ionicons name="arrow-down-outline" size={18} color={TEXT} />
                            </Pressable>

                            <Pressable
                              onPress={() => removeStep(s.position)}
                              style={{
                                padding: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#FEE4E2",
                                backgroundColor: "#FEF3F2",
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color={DANGER} />
                            </Pressable>
                          </View>
                        </View>

                        <View style={{ height: 10 }} />

                        <TextField
                          value={s.body}
                          onChangeText={(t) => setStepBody(s.position, t)}
                          placeholder="Write step details…"
                          multiline
                        />
                      </CardView>
                    );
                  })}

                  <SecondaryButton label="Add step" icon="add-circle-outline" onPress={addStep} />
                </View>
              ) : null}
            </CardView>

            {/* SAVE / DELETE */}
            <CardView>
              <H2>Finish</H2>

              <View style={{ gap: 10 }}>
                <PrimaryButton
                  label={saving ? "Saving…" : editing ? "Save changes" : "Create recipe"}
                  icon={editing ? "save-outline" : "add-circle-outline"}
                  onPress={saveRecipe}
                  loading={saving}
                />

                {editing ? (
                  <DangerButton label="Delete recipe" icon="trash-outline" onPress={deleteRecipe} />
                ) : null}

                <SecondaryButton
                  label="Back to My Account"
                  icon="person-outline"
                  onPress={goBackOrHome}
                />

                <View style={{ marginTop: 6 }}>
                  <Text style={{ color: SUBTEXT, fontWeight: "600" }}>
                    Tip: Keep title + caption clean so it looks fire on the Feed cards.
                  </Text>
                </View>
              </View>
            </CardView>

            {/* Footer spacing */}
            <View style={{ height: spacing(2) }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Scroll to top button */}
      <Pressable
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        style={{
          position: "absolute",
          right: 16,
          bottom: 96,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: BRAND,
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
        }}
      >
        <Ionicons name="arrow-up" size={22} color="#fff" />
      </Pressable>

    </SafeAreaView>
  ); 
}