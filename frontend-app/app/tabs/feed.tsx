import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
  TextInput,
  RefreshControl,
  Keyboard,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { resolveImageUrl } from "../../src/lib/images";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { likesStore } from "../../src/lib/likesStore";



/* ───────────────────────────────── Theme ───────────────────────────────── */

const BRAND = "#2E7D32";
const BRAND_DARK = "#1B5E20";
const BG = "#F6F7F8";
const CARD = "#FFFFFF";
const TEXT = "#101828";
const SUBTEXT = "#667085";
const BORDER = "#E5E7EB";
const DANGER = "#E53935";

const CHIP_BG = "rgba(255,255,255,0.18)";
const CHIP_BG_ACTIVE = "#FFFFFF";

const { width } = Dimensions.get("window");

/* ───────────────────────────────── Types ───────────────────────────────── */

type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  user_id: string;
  tags?: string[] | null;
  prep_time?: string | null;
  cook_time?: string | null;
  difficulty?: string | null;
  created_at?: string | null; // IMPORTANT for stable infinite scroll
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;

  // Optional preference fields (safe: might not exist in your schema)
  diet_tags?: string[] | null;
  preferred_tags?: string[] | null;
};

/* ───────────────────────────────── Categories ───────────────────────────────── */

const CATEGORIES = [
  { label: "All", icon: "apps-outline", tag: "ALL" },
  { label: "Vegan", icon: "leaf-outline", tag: "Vegan" },
  { label: "Vegetarian", icon: "nutrition-outline", tag: "Vegetarian" },
  { label: "Gluten-Free", icon: "ban-outline", tag: "Gluten-Free" },
  { label: "Halal", icon: "checkmark-circle-outline", tag: "Halal" },
  { label: "Dessert", icon: "ice-cream-outline", tag: "Dessert" },
  { label: "Comfort", icon: "restaurant-outline", tag: "Comfort Food" },
  { label: "Quick", icon: "flash-outline", tag: "Quick" },
];

/* ───────────────────────────────── Helpers ───────────────────────────────── */

const DEFAULT_AVATAR = require("../../assets/avatarplaceholder.png");

function clampCount(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

function formatCount(n: number) {
  const x = clampCount(n);
  if (x < 1000) return String(x);
  if (x < 1_000_000) return `${(x / 1000).toFixed(x % 1000 === 0 ? 0 : 1)}k`;
  return `${(x / 1_000_000).toFixed(x % 1_000_000 === 0 ? 0 : 1)}m`;
}

function makeSearchOr(q: string) {
  // Supabase OR syntax uses commas between clauses.
  // Search title + caption. Replace commas so OR string doesn't break.
  const safe = q.replace(/,/g, " ");
  return `title.ilike.%${safe}%,caption.ilike.%${safe}%`;
}

function toNumberId(x: any): number {
  // common Supabase issue: bigint returns as string
  const n = typeof x === "string" ? parseInt(x, 10) : Number(x);
  return Number.isFinite(n) ? n : 0;
}

function uniqById(list: Recipe[]) {
  const map = new Map<number, Recipe>();
  list.forEach((r) => map.set(r.id, r));
  return Array.from(map.values());
}

function pickOnePrimaryTag(tags?: string[] | null) {
  const arr = (tags ?? []).filter(Boolean);
  if (!arr.length) return null;

  // Prefer “diet” style tags if present
  const priority = ["Vegan", "Vegetarian", "Halal", "Gluten-Free", "Keto", "Pescatarian"];
  const found = priority.find((p) => arr.includes(p));
  return found ?? arr[0];
}

/* ───────────────────────────────── Heart Burst (IG-style) ───────────────────────────────── */

type HeartBurstHandle = {
  burst: () => void;
};

const HeartBurst = forwardRef<HeartBurstHandle, { visible?: boolean }>((props, ref) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const burst = useCallback(() => {
    scale.setValue(0.2);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          delay: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 240,
          delay: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [opacity, scale]);

  useImperativeHandle(ref, () => ({ burst }), [burst]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -42 }, { translateY: -42 }, { scale }],
        opacity,
      }}
    >
      <Ionicons name="heart" size={84} color="rgba(255,77,77,0.92)" />
    </Animated.View>
  );
});
HeartBurst.displayName = "HeartBurst";

/* ───────────────────────────────── Feed Header ───────────────────────────────── */

function FeedHeader({
  search,
  setSearch,
  activeTags,
  setTagAndReload,
  isFetching,
}: {
  search: string;
  setSearch: (v: string) => void;
  activeTags: string[];
  setTagAndReload: (tag: string) => void;
  isFetching: boolean;
}) {
  return (
    <View style={{ backgroundColor: BG }}>
      <LinearGradient
        colors={[BRAND, BRAND_DARK]}
        style={{
          paddingTop: 10,
          paddingBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        {/* Title */}
        <View style={{ alignItems: "center", position: "relative" }}>
          <Pressable
            onPress={() => router.push("/guide")}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="help-outline" size={20} color="white" />
          </Pressable>
          <Text
            style={{
              color: "white", 
              fontSize: 30,
              fontWeight: "900",
              letterSpacing: 1,
            }}
          >
            Flavur
          </Text>
        </View>


        {/* Search */}
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
          }}
        >
          <Ionicons name="search-outline" size={18} color="white" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes…"
            placeholderTextColor="rgba(255,255,255,0.75)"
            style={{ flex: 1, color: "white", fontWeight: "800" }}
            returnKeyType="search"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {/* Tags */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {CATEGORIES.map((c) => {
            const active =
              c.tag === "ALL"
                ? activeTags.length === 0
                : activeTags.includes(c.tag);

            return (
              <Pressable
                key={c.tag}
                onPress={() => setTagAndReload(c.tag)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  marginRight: 10,
                  backgroundColor: active
                    ? "white"
                    : "rgba(255,255,255,0.18)",
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                }}
              >
                <Ionicons
                  name={c.icon as any}
                  size={16}
                  color={active ? BRAND : "white"}
                />
                <Text
                  style={{
                    color: active ? BRAND : "white",
                    fontWeight: "900",
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isFetching && (
          <View style={{ marginTop: 8 }}>
            <ActivityIndicator color="white" />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}


/* ───────────────────────────────── Feed Screen ───────────────────────────────── */

type FeedMode = "DISCOVER" | "FOR_YOU";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [userId, setUserId] = useState<string | null>(null);
  const [meProfile, setMeProfile] = useState<Profile | null>(null);

  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);

  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [mode, setMode] = useState<FeedMode>("DISCOVER");

  const [initialLoading, setInitialLoading] = useState(true);

  const scrollRef = useRef<FlatList>(null);
  const params = useLocalSearchParams<{ ts?: string }>();


  // IMPORTANT:
  // We do NOT toggle between (loading ? skeletonlist : flatlist) anymore.
  // That was causing the TextInput to remount + keyboard to dismiss every keystroke.
  const [refreshing, setRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // search + paging
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const PAGE_SIZE = 12;

  // Infinite scroll cursor (created_at + id for stable ordering)
  const [cursor, setCursor] = useState<{ created_at: string; id: number } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // optimistic counts (likes)
  const [likesOverride, setLikesOverride] = useState<Record<number, number>>({});

  const searchInputRef = useRef<TextInput | null>(null);
  const lastTapRef = useRef<number>(0);

  // Per-card heart animation refs
  const heartRefs = useRef<Map<number, HeartBurstHandle | null>>(new Map());

  // Track failed images for fallback display
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  /* ────────────────────────────── Boot: Auth + First Load ────────────────────────────── */

  useEffect(() => {
    // whenever the tab is tapped, _layout.tsx changes ?ts=...
    // this forces a re-run here
    if (params?.ts) {
      // go top
      scrollRef.current?.scrollToOffset({ offset: 0, animated: false });

      // full refresh
      loadFeed({ reset: true, reason: "refresh" });
    }
  }, [params?.ts]);
 


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        await Promise.all([loadLikes(uid), loadSaved(uid), loadMeProfile(uid)]);
      }

      // First feed load
      await loadFeed({ reset: true, reason: "initial" });

      setInitialLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ────────────────────────────── Debounce Search (no keyboard dismiss) ────────────────────────────── */

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    // search triggers reset fetch, but we do not unmount FlatList
    loadFeed({ reset: true, reason: "search" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    loadFeed({ reset: true, reason: "tags" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTags]);

  /* ────────────────────────────── Derived: For You tags ────────────────────────────── */

  const forYouTags = useMemo(() => {
    if (!meProfile) return [];
    const a = (meProfile.diet_tags ?? []).filter(Boolean) as string[];
    const b = (meProfile.preferred_tags ?? []).filter(Boolean) as string[];
    // de-dupe
    return Array.from(new Set([...a, ...b]));
  }, [meProfile]);

  const effectiveTags = useMemo(() => {
    const real = activeTags.filter((t) => t !== "ALL");
    if (mode === "FOR_YOU" && forYouTags.length) {
      // merge + de-dupe
      return Array.from(new Set([...real, ...forYouTags]));
    }
    return real;
  }, [activeTags, mode, forYouTags]);

  /* ────────────────────────────── Data Fetchers ────────────────────────────── */

  async function loadMeProfile(uid: string) {
    // Safe: diet_tags/preferred_tags may not exist, so we try and ignore errors.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, diet_tags, preferred_tags")
      .eq("id", uid)
      .maybeSingle();

    if (!error && data) {
      setMeProfile(data as Profile);
    }
  }

  async function loadLikes(uid: string) {
    const { data } = await supabase.from("likes").select("recipe_id").eq("user_id", uid);
    setLiked((data ?? []).map((r) => toNumberId((r as any).recipe_id)));
  }

  async function loadSaved(uid: string) {
    const { data } = await supabase
      .from("user_added_recipes")
      .select("recipe_id")
      .eq("user_id", uid);

    setSaved((data ?? []).map((r) => toNumberId((r as any).recipe_id)));
  }

  async function hydrateProfiles(list: Recipe[]) {
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const missing = userIds.filter((id) => !profiles[id]);

    if (!missing.length) return;

    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", missing);

    const map: Record<string, Profile> = { ...profiles };
    (profs ?? []).forEach((p) => (map[(p as any).id] = p as Profile));
    setProfiles(map);
  }

  async function loadFeed(opts: { reset: boolean; reason: "initial" | "search" | "tags" | "mode" | "refresh" | "paginate" }) {
    const { reset, reason } = opts;

    // Prevent overlap
    if (!reset) {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    } else {
      // Reset fetch should not unmount list. We just show top spinner via isFetching.
      setIsFetching(true);
      setHasMore(true);
      setCursor(null);
    }

    try {
      // Stable ordering: created_at desc, id desc
      let q = supabase
        .from("public_recipes_with_stats")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      // Tags filter
      if (effectiveTags.length) {
        q = q.overlaps("tags", effectiveTags);
      }

      // Search filter
      if (debouncedSearch.length) {
        q = q.or(makeSearchOr(debouncedSearch));
      }

      // Cursor pagination: load older than the last item
      if (!reset && cursor) {
        // We want: (created_at < cursor.created_at) OR (created_at = cursor.created_at AND id < cursor.id)
        // Supabase supports .or("...") across columns with proper format.
        q = q.or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
        );
      }

      const { data, error } = await q;

      if (error) {
        // fail soft
        return;
      }

      const list = ((data ?? []) as Recipe[]).map((r) => ({
        ...r,
        id: toNumberId((r as any).id),
      }));

      // Update cursor based on last element
      const last = list[list.length - 1];
      if (last?.created_at) setCursor({ created_at: last.created_at, id: last.id });

      // hasMore
      setHasMore(list.length === PAGE_SIZE);

      if (reset) {
        setRecipes(list);
        await hydrateProfiles(list);
      } else {
        // Merge + de-dupe so infinite scroll never repeats
        setRecipes((prev) => {
          const merged = uniqById([...prev, ...list]);
          return merged;
        });
        await hydrateProfiles(list);
      }
    } finally {
      setIsFetching(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  /* ────────────────────────────── Actions ────────────────────────────── */

  async function toggleLike(id: number, baseLikesCount: number) {
    if (!userId) return;
    const has = liked.includes(id);

    // optimistic UI
    setLiked((p) => (has ? p.filter((x) => x !== id) : [...p, id]));
    setLikesOverride((m) => {
      const current = m[id] ?? baseLikesCount;
      const next = has ? current - 1 : current + 1;
      return { ...m, [id]: clampCount(next) };
    });

    try {
      if (has) {
        await supabase.from("likes").delete().eq("recipe_id", id).eq("user_id", userId);
      } else {
        await supabase.from("likes").insert({ recipe_id: id, user_id: userId });
      }
    } catch {
      // revert
      setLiked((p) => (has ? [...p, id] : p.filter((x) => x !== id)));
      setLikesOverride((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
    }
  }

  async function toggleSave(id: number, ownerId: string) {
    if (!userId) return;

    // allow saving your own? your original code blocked it.
    // Your requirement says: if you created it, show tag (not saved).
    // We'll keep the original behavior: no saving your own recipes.
    if (ownerId === userId) return;

    const has = saved.includes(id);

    // optimistic
    setSaved((p) => (has ? p.filter((x) => x !== id) : [...p, id]));

    try {
      if (has) {
        await supabase
          .from("user_added_recipes")
          .delete()
          .eq("recipe_id", id)
          .eq("user_id", userId);
      } else {
        await supabase.from("user_added_recipes").insert({ recipe_id: id, user_id: userId });
      }
    } catch {
      // revert
      setSaved((p) => (has ? [...p, id] : p.filter((x) => x !== id)));
    }
  }

  function triggerHeartBurst(recipeId: number) {
    const ref = heartRefs.current.get(recipeId);
    ref?.burst?.();
  }

  function onCardImagePress(item: Recipe, likeCount: number) {
    // double tap detection
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;

    if (delta < 260) {
      // IG behavior: double tap only LIKES (doesn't unlike)
      if (!liked.includes(item.id)) {
        triggerHeartBurst(item.id);
        toggleLike(item.id, likeCount);
      } else {
        // still show the pop if already liked
        triggerHeartBurst(item.id);
      }
    } else {
      // Single tap: navigate to recipe
      router.push(`/recipe/${item.id}`);
    }
  }

  /* ────────────────────────────── Header helpers ────────────────────────────── */

  const headerSubtitle = useMemo(() => {
    if (debouncedSearch.length) return `Results for “${debouncedSearch}”`;
    if (mode === "FOR_YOU") {
      if (forYouTags.length) return `For you • ${forYouTags.slice(0, 3).join(", ")}${forYouTags.length > 3 ? "…" : ""}`;
      return "For you • Based on what you like";
    }
    if (activeTags.length === 0) return "Explore recipes from creators around the world";
    if (activeTags.length === 1) return `Filtered by ${activeTags[0]}`;
    return `Filtered by ${activeTags.length} tags`;
  }, [activeTags, debouncedSearch, mode, forYouTags]);

  const setTagAndReload = useCallback((tag: string) => {
    setActiveTags((prev) => {
      if (tag === "ALL") return [];

      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }

      return [...prev, tag];
    });
  }, []);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed({ reset: true, reason: "refresh" });
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    // keep keyboard open if user is typing
  }, []);

  const switchMode = useCallback((m: FeedMode) => {
    setMode(m);
    loadFeed({ reset: true, reason: "mode" });
  }, []);

  /* ───────────────────────────────── UI Pieces ───────────────────────────────── */

  const SavedRibbon = ({ text = "Saved" }: { text?: string }) => {
    // web-style ribbon on top-left
    return (
      <View
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 14,
          backgroundColor: BRAND,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          maxWidth: width - 120,
        }}
      >
        <Ionicons name="bookmark" size={16} color="white" />
        <Text style={{ color: "white", fontWeight: "900", letterSpacing: 0.3 }}>{text}</Text>
      </View>
    );
  };

  const TagPillOverlay = ({ tag }: { tag: string }) => {
    return (
      <View
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 14,
          backgroundColor: "rgba(0,0,0,0.55)",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          maxWidth: width - 120,
        }}
      >
        <Ionicons name="pricetag" size={16} color="white" />
        <Text style={{ color: "white", fontWeight: "900", letterSpacing: 0.3 }}>{tag}</Text>
      </View>
    );
  };

  /* ───────────────────────────────── Recipe Card ───────────────────────────────── */

  const renderRecipe = useCallback(
    ({ item }: { item: Recipe }) => {
      const author = profiles[item.user_id];
      const isLiked = liked.includes(item.id);
      const isSaved = saved.includes(item.id);
      const isMine = userId != null && item.user_id === userId;

      const likeCount = likesOverride[item.id] ?? clampCount(item.likes_count ?? 0);
      const commentCount = clampCount(item.comments_count ?? 0);

      // Overlay rules:
      // - ONLY ONE overlay
      // - Saved wins
      // - If mine, don't show Saved (can't save own anyway), show 1 primary diet tag if exists
      const primaryTag = pickOnePrimaryTag(item.tags);
      const showSavedOverlay = isSaved && !isMine;
      const showTagOverlay = !showSavedOverlay && !!primaryTag;

      return (
        <Pressable
          onPress={() => router.push(`/recipe/${item.id}`)}
          style={{
            backgroundColor: CARD,
            borderRadius: 22,
            overflow: "hidden",
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.05)",
            shadowColor: "#000", 
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
          }}
        >
          {/* Image */}
          <View>
            {item.image_url && !failedImages.has(item.id) ? (
              <Pressable onPress={() => onCardImagePress(item, likeCount)} style={{ position: "relative" }}>
                <Image 
                  source={{ uri: resolveImageUrl("recipe-media", item.image_url) }} 
                  style={{ width: "100%", height: 252 }} 
                  resizeMode="cover"
                  onError={(error: any) => {
                    console.error('Failed to load recipe image:', item.image_url);
                    console.error('Image URL that failed:', resolveImageUrl("recipe-media", item.image_url));
                    console.error('Error message:', error.nativeEvent?.error || error.message || 'No message');
                    console.error('Error code:', error.nativeEvent?.code || error.code || 'No code');
                    
                    // Set a fallback state to show placeholder
                    setFailedImages(prev => new Set(prev).add(item.id));
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded recipe image:', item.image_url);
                  }}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.50)"]}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: "44%",
                  }}
                />

                {/* Heart burst animation */}
                <HeartBurst
                  ref={(r) => {
                    heartRefs.current.set(item.id, r);
                  }}
                />

                {/* Only one overlay: Saved or Tag */}
                {showSavedOverlay ? <SavedRibbon text="Saved" /> : null}
                {showTagOverlay ? <TagPillOverlay tag={primaryTag!} /> : null}
              </Pressable>
            ) : (
              <View
                style={{
                  height: 252,
                  backgroundColor: "#EEF2F3",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="image-outline" size={32} color="#98A2B3" />
                <Text style={{ color: "#98A2B3", marginTop: 8, fontWeight: "700" }}>Image unavailable</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ padding: 16 }}>
            <Pressable onPress={() => router.push(`/recipe/${item.id}`)}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: TEXT,
                  letterSpacing: 0.2,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </Pressable>

            {item.caption ? (
              <Text style={{ color: SUBTEXT, marginTop: 8, lineHeight: 18 }} numberOfLines={3}>
                {item.caption}
              </Text>
            ) : null}

            {/* Tags (ALL shown) */}
            {(item.tags ?? []).length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 12 }}
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {(item.tags ?? []).filter(Boolean).map((t) => (
                  <View
                    key={`${item.id}-${t}`}
                    style={{
                      backgroundColor: "#E9F7EF",
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: "rgba(46,125,50,0.12)",
                    }}
                  >
                    <Text style={{ color: BRAND, fontSize: 12, fontWeight: "900" }}>{t}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Meta row (BIGGER + clearer) */}
            {(item.prep_time || item.cook_time || item.difficulty) ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 14,
                  marginTop: 12,
                }}
              >
                {item.prep_time ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Ionicons name="time-outline" size={16} color={SUBTEXT} />
                    <Text style={{ fontSize: 13.5, color: SUBTEXT, fontWeight: "900" }}>
                      Prep {item.prep_time}
                    </Text>
                  </View>
                ) : null}

                {item.cook_time ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Ionicons name="flame-outline" size={16} color={SUBTEXT} />
                    <Text style={{ fontSize: 13.5, color: SUBTEXT, fontWeight: "900" }}>
                      Cook {item.cook_time}
                    </Text>
                  </View>
                ) : null}

                {item.difficulty ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Ionicons name="options-outline" size={16} color={SUBTEXT} />
                    <Text style={{ fontSize: 13.5, color: SUBTEXT, fontWeight: "900" }}>
                      {item.difficulty}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Action Bar */}
          <View
            style={{
              borderTopWidth: 1,
              borderColor: BORDER,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* left actions */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Pressable
                onPress={() => toggleLike(item.id, likeCount)}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                hitSlop={10}
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={isLiked ? DANGER : "#475467"}
                />
                <Text style={{ fontWeight: "900", color: "#344054" }}>{formatCount(likeCount)}</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(`/recipe/${item.id}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                hitSlop={10}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#475467" />
                <Text style={{ fontWeight: "900", color: "#344054" }}>{formatCount(commentCount)}</Text>
              </Pressable>
            </View>

            {/* right actions + author */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {/* Save button now clearly toggles */}
              <Pressable
                onPress={() => toggleSave(item.id, item.user_id)}
                hitSlop={10}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={isSaved ? BRAND : "#475467"}
                />
                <Text style={{ fontWeight: "900", color: isSaved ? BRAND : "#475467", fontSize: 12 }}>
                  {isMine ? "Mine" : isSaved ? "Remove" : "Save"}
                </Text>
              </Pressable>

              {author ? (
                <Pressable
                  onPress={() => router.push(`/user/${author.id}`)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingLeft: 10,
                    borderLeftWidth: 1,
                    borderLeftColor: "rgba(0,0,0,0.06)",
                    maxWidth: 160,
                  }}
                  hitSlop={8}
                >
                  <Image
                    source={author.avatar_url ? { uri: resolveImageUrl("profile-avatars", author.avatar_url) } : DEFAULT_AVATAR}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "#EEF2F6",
                    }}
                  />
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#344054" }} numberOfLines={1}>
                    {author.username ?? "Creator"}
                  </Text>
                </Pressable>
              ) : (
                <View style={{ width: 90, height: 28 }} />
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [profiles, liked, saved, likesOverride, userId]
  );

  /* ───────────────────────────────── Skeleton ───────────────────────────────── */

  const SkeletonCard = memo(function SkeletonCardInner() {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }, [shimmer]);

    const translateX = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-width, width],
    });

    return (
      <View
        style={{
          backgroundColor: "#FFF",
          borderRadius: 22,
          overflow: "hidden",
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.05)",
        }}
      >
        <View style={{ height: 252, backgroundColor: "#E5E7EB" }} />
        <View style={{ padding: 16 }}>
          <View style={{ height: 20, width: "70%", backgroundColor: "#E5E7EB", borderRadius: 6 }} />
          <View style={{ height: 14, width: "90%", backgroundColor: "#E5E7EB", borderRadius: 6, marginTop: 10 }} />
          <View style={{ height: 14, width: "60%", backgroundColor: "#E5E7EB", borderRadius: 6, marginTop: 8 }} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ height: 26, width: 76, backgroundColor: "#E5E7EB", borderRadius: 999 }} />
            <View style={{ height: 26, width: 66, backgroundColor: "#E5E7EB", borderRadius: 999 }} />
          </View>
        </View>

        <View style={{ height: 48, backgroundColor: "#F3F4F6" }} />

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: [{ translateX }],
          }}
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.6)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: width, height: "100%" }}
          />
        </Animated.View>
      </View>
    );
  });

  

  /* ───────────────────────────────── Empty + Footer ───────────────────────────────── */

  const EmptyState = useMemo(() => {
    return (
      <View style={{ padding: 22, alignItems: "center" }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#EEF2F6",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="search-outline" size={24} color="#667085" />
        </View>
        <Text style={{ fontWeight: "900", fontSize: 16, color: TEXT }}>No recipes found</Text>
        <Text style={{ marginTop: 6, color: SUBTEXT, textAlign: "center", lineHeight: 18 }}>
          Try a different search, or clear filters and reload the feed.
        </Text>

        <Pressable
          onPress={() => {
            setActiveTags([]);
            setMode("DISCOVER");
            setSearch("");
            loadFeed({ reset: true, reason: "tags" });
          }}
          style={{
            marginTop: 14,
            backgroundColor: BRAND,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>Reset</Text>
        </Pressable>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ListFooter = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 26 }} />;
    return (
      <View style={{ paddingVertical: 18 }}>
        <ActivityIndicator />
      </View>
    );
  }, [loadingMore]);

  /* ───────────────────────────────── Main UI ───────────────────────────────── */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* 🔒 FIXED HEADER */}
      <FeedHeader
        search={search}
        setSearch={setSearch}
        activeTags={activeTags}
        setTagAndReload={setTagAndReload}
        isFetching={isFetching}
      />

      {/* 🔄 SCROLLING FEED */}
      <FlatList
        ref={scrollRef}
        data={initialLoading ? ([1, 2, 3, 4] as any[]) : recipes}
        renderItem={initialLoading ? () => <SkeletonCard /> : (renderRecipe as any)}
        keyExtractor={(i: any) => (typeof i === "number" ? String(i) : String(i.id))}
        ListEmptyComponent={!initialLoading ? EmptyState : null}
        ListFooterComponent={!initialLoading ? ListFooter : null}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
        }
        onEndReachedThreshold={0.55}
        onEndReached={() => {
          if (!initialLoading && hasMore && !loadingMore) {
            loadFeed({ reset: false, reason: "paginate" });
          }
        }}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </SafeAreaView>
  );

}
