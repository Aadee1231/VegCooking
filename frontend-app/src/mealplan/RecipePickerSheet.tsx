import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { resolveImageUrl } from "../lib/images";
import { theme } from "../ui/theme";

/**
 * RecipePickerSheet
 * - Slide-up bottom sheet that fetches recipes from Supabase
 * - Includes search + scroll
 * - Calls onSelect(recipe) and then you close it from parent
 */

export type PickableRecipe = {
  id: number;
  title: string;
  image_url: string | null;
  caption?: string | null;
  tags?: string[] | null;
  prep_time?: string | null; 
  cook_time?: string | null;
  difficulty?: string | null;
  user_id?: string;
  created_at?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (recipe: PickableRecipe) => void;
  initialTags?: string[]; // optional future use
  title?: string;
};

const PAGE_SIZE = 30;

export function RecipePickerSheet({
  open,
  onClose,
  onSelect,
  initialTags,
  title = "Choose a Recipe",
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PickableRecipe[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const searchRef = useRef<TextInput>(null);


  // initial load when opened
  useEffect(() => {
    if (!open) return;

    setQuery("");
    setRows([]);
    setPage(0);
    setHasMore(true);
    loadPage(0, "", true);

    // 🔥 force keyboard open (especially on iOS pageSheet)
    setTimeout(() => {
      searchRef.current?.focus();
    }, 150);
  }, [open]);


  // Search debounce
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setRows([]);
      setPage(0);
      setHasMore(true);
      loadPage(0, query, true);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function loadPage(nextPage: number, q: string, replace: boolean) {
    if (loading) return;
    setLoading(true);

    try {
      let req = supabase
        .from("public_recipes_with_stats")
        .select(
          "id,title,image_url,caption,tags,prep_time,cook_time,difficulty,user_id,created_at"
        )
        .order("created_at", { ascending: false })
        .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

      // optional tags filter (future-ready)
      if (initialTags && initialTags.length) {
        req = req.overlaps("tags", initialTags);
      }

      // text search (simple title ilike)
      if (q.trim().length) {
        req = req.ilike("title", `%${q.trim()}%`);
      }

      const { data, error } = await req;

      if (error) throw error;

      const incoming = (data ?? []) as PickableRecipe[];
      setRows((prev) => (replace ? incoming : [...prev, ...incoming]));

      setHasMore(incoming.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (e: any) {
      console.error("RecipePickerSheet load error:", e?.message ?? e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    Keyboard.dismiss();
    onClose();
  }

  function handleSelect(r: PickableRecipe) {
    Keyboard.dismiss();
    onSelect(r);
  }

  const Item = ({ item }: { item: PickableRecipe }) => {
    const img = resolveImageUrl("recipe-media", item.image_url);


    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {/* image */}
          <View
            style={{
              width: 92,
              height: 92,
              backgroundColor: theme.colors.chip,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {img ? (
              <Image source={{ uri: img }} style={{ width: 92, height: 92 }} />
            ) : (
              <Ionicons name="image-outline" size={24} color={theme.colors.subtext} />
            )}
          </View>

          {/* content */}
          <View style={{ flex: 1, padding: 12 }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: theme.colors.text,
              }}
            >
              {item.title}
            </Text>

            {!!item.caption && (
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 4,
                  color: theme.colors.subtext,
                  fontSize: 12,
                }}
              >
                {item.caption}
              </Text>
            )}

            {/* meta row */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {item.prep_time ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.subtext} />
                  <Text style={{ fontSize: 12, color: theme.colors.subtext }}>{item.prep_time}</Text>
                </View>
              ) : null}

              {item.cook_time ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="flame-outline" size={14} color={theme.colors.subtext} />
                  <Text style={{ fontSize: 12, color: theme.colors.subtext }}>{item.cook_time}</Text>
                </View>
              ) : null}

              {item.difficulty ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="speedometer-outline" size={14} color={theme.colors.subtext} />
                  <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
                    {item.difficulty}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* arrow */}
          <View style={{ paddingRight: 12, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.subtext} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View style={{ flex: 1, backgroundColor: "#f7faf7" }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.text }}>
              {title}
            </Text>
            <Pressable
              onPress={close}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={18} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.subtext} />
            <TextInput
              ref={searchRef}           // ✅ NEW
              autoFocus                // ✅ NEW
              placeholder="Search recipes..."
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 15 }}
              placeholderTextColor={theme.colors.subtext}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={theme.colors.subtext} />
              </Pressable>
            )}
          </View>
        </View>

        {/* List */}
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Item item={item} />}
          onEndReached={() => {
            if (!loading && hasMore) loadPage(page + 1, query, false);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: 14 }}>
                <ActivityIndicator />
              </View>
            ) : !rows.length ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <Ionicons name="restaurant-outline" size={22} color={theme.colors.subtext} />
                <Text style={{ marginTop: 8, color: theme.colors.subtext }}>
                  No recipes found.
                </Text>
              </View>
            ) : (
              <View style={{ height: 8 }} />
            )
          }
        />
      </View>
    </Modal>
  );
}
