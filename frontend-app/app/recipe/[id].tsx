import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import AnimatedReanimated, { useSharedValue, withTiming } from "react-native-reanimated";

import { resolveImageUrl } from "../../src/lib/images";
import { resolveIngredientEmoji } from "../../src/lib/ingredientEmoji";
import { supabase } from "../../src/lib/supabase";
import { toast } from "../../src/lib/toast";
import { Button, Card, Chip, H3, Muted, Screen } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";



/** ---- Types (matches web) ---- */
type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  tags?: string[] | null;
  prep_time?: string | null;
  cook_time?: string | null;
  difficulty?: string | null;
  demo_url?: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type Ingredient = {
  name: string;
  emoji: string | null;
  quantity: number | null;
  unit_code: string | null;
  notes: string | null;
};

type Step = {
  position: number;
  body: string;
};

type CommentRow = {
  id: number;
  body: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
};

type SimilarRecipe = {
  id: number;
  title: string;
  image_url: string | null;
  tags?: string[] | null;
};

/* ───────────────────────────────── Heart Burst (IG-style) ───────────────────────────────── */

type HeartBurstHandle = {
  burst: () => void;
};

const HeartBurst = forwardRef<HeartBurstHandle, { visible?: boolean }>((props: any, ref: any) => {
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


function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function extractMinutes(s?: string | null) {
  if (!s) return 0;
  const n = parseInt(String(s).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function totalTimeLabel(prep?: string | null, cook?: string | null) {
  const p = extractMinutes(prep);
  const c = extractMinutes(cook);
  if (!p && !c) return null;
  return `${p + c} min`;
}

function isYoutube(url: string) {
  const u = url.toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be");
}

function CommentCard({
  c,
  liked,
  onLike,
  onDelete,
}: {
  c: CommentRow;
  liked: boolean;
  onLike: () => void;
  onDelete?: () => void;
}) {
  const lastTap = useRef(0);
  const scale = useSharedValue(0);

  function handleTap() {
    const now = Date.now();
    const delta = now - lastTap.current;
    lastTap.current = now;

    if (delta < 260) {
      scale.value = 1.3;

      scale.value = withTiming(0, {
        duration: 500,
      });

      if (!liked) onLike();
    }
  }

  return (
    <Pressable onPress={handleTap}>
      <Animated.View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 16,
          backgroundColor: "white",
          padding: 12,
        }}
      >
        {/* HEADER */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              overflow: "hidden",
              backgroundColor: theme.colors.chip,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {c.profiles?.avatar_url ? (
              <Image
                source={{
                  uri: resolveImageUrl("profile-avatars", c.profiles.avatar_url),
                }}
                style={{ width: 34, height: 34 }}
              />
            ) : (
              <Ionicons name="person-outline" size={16} color={theme.colors.subtext} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", color: theme.colors.text }}>
              {c.profiles?.username ?? "User"}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
              {new Date(c.created_at).toLocaleString()}
            </Text>
          </View>

          {onDelete ? (
            <Pressable onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color="#c62828" />
            </Pressable>
          ) : null}
        </View>

        {/* BODY */}
        <Text style={{ marginTop: 10, color: theme.colors.text, lineHeight: 20 }}>
          {c.body}
        </Text>

        {/* LIKE ROW */}
        <View style={{ marginTop: 10 }}>
          <Pressable
            onPress={onLike}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#e53935" : theme.colors.subtext}
            />
          </Pressable>
        </View>

        {/* HEART ANIMATION */}
        <AnimatedReanimated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "40%",
            left: "40%",
            transform: [{ scale }],
            opacity: scale,
          }}
        >
          <Ionicons name="heart" size={44} color="#e53935" />
        </AnimatedReanimated.View>
      </Animated.View>
    </Pressable>
  );
}



export default function RecipeDetailScreen() {


  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = useMemo(() => Number(id), [id]);

  const commentsRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const heartBurstRef = useRef<HeartBurstHandle>(null);
  const lastTapRef = useRef<number>(0);

  const [heroUrl, setHeroUrl] = useState<string | undefined>();
  const [authorAvatar, setAuthorAvatar] = useState<string | undefined>();


  const scrollToComments = () => {
    commentsRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (scrollViewRef.current && pageY !== undefined) {
        scrollViewRef.current.scrollTo({ y: pageY - 20, animated: true });
      }
    });
  };

  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [similar, setSimilar] = useState<SimilarRecipe[]>([]);

  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const [commentLikes, setCommentLikes] = useState<Record<number, number>>({});
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());

  const [isRecipeLiked, setIsRecipeLiked] = useState(false);
  const [isRecipeSaved, setIsRecipeSaved] = useState(false);

  useEffect(() => {
    if (!author?.avatar_url) return;
    setAuthorAvatar(resolveImageUrl("profile-avatars", author.avatar_url));
  }, [author?.avatar_url]);


  useEffect(() => {
    if (!recipe?.image_url) return;
    setHeroUrl(resolveImageUrl("recipe-media", recipe.image_url));
  }, [recipe?.image_url]);



  // ---- auth ----
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // ---- load ----
  useEffect(() => {
    if (!recipeId || Number.isNaN(recipeId)) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, currentUserId]);

  async function loadUserRecipeState(rid: number, uid: string) {
    // like state
    const { data: like } = await supabase
      .from("likes")
      .select("id")
      .eq("recipe_id", rid)
      .eq("user_id", uid)
      .maybeSingle();
    setIsRecipeLiked(!!like);

    // saved state
    const { data: saved } = await supabase
      .from("user_added_recipes")
      .select("id")
      .eq("recipe_id", rid)
      .eq("user_id", uid)
      .maybeSingle();
    setIsRecipeSaved(!!saved);
  }

  async function loadComments() {
    // comments + count (matches web)
    const { data, count, error } = await supabase
      .from("comments")
      .select("id,body,created_at,user_id,profiles(username,avatar_url)", { count: "exact" })
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setComments([]);
      setCommentCount(0);
      return;
    }

    setComments((data ?? []) as any);
    setCommentCount(count ?? 0);

    // comment likes map (same as web)
    const { data: likesData } = await supabase.from("comment_likes").select("comment_id,user_id");

    const likeMap: Record<number, number> = {};
    const userLiked = new Set<number>();

    (likesData ?? []).forEach((l: any) => {
      likeMap[l.comment_id] = (likeMap[l.comment_id] || 0) + 1;
      if (l.user_id === currentUserId) userLiked.add(l.comment_id);
    });

    setCommentLikes(likeMap);
    setLikedComments(userLiked);
  }

  async function loadAll() {
    setLoading(true);
    try {
      // recipe
      const { data: rec, error: recErr } = await supabase.from("recipes").select("*").eq("id", recipeId).single();

      if (recErr || !rec) {
        console.error(recErr);
        setRecipe(null);
        return;
      }

      setRecipe(rec as any);

      if (currentUserId) {
        await loadUserRecipeState(rec.id, currentUserId);
      } else {
        setIsRecipeLiked(false);
        setIsRecipeSaved(false);
      }

      // author
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .eq("id", rec.user_id)
        .single();
      setAuthor((prof ?? null) as any);

      // ingredients + steps (matches web)
      const [{ data: ing }, { data: st }] = await Promise.all([
        supabase
          .from("recipe_ingredients")
          .select("quantity,unit_code,notes,ingredients(name, emoji)")
          .eq("recipe_id", recipeId)
          .order("position"),
        supabase.from("recipe_steps").select("position,body").eq("recipe_id", recipeId).order("position"),
      ]);

      setIngredients(
        (ing ?? []).map((r: any) => ({
          name: r.ingredients?.name,
          emoji: resolveIngredientEmoji(r.ingredients?.name),
          quantity: r.quantity,
          unit_code: r.unit_code,
          notes: r.notes,
        }))
      );
      setSteps((st ?? []) as any);

      // likes count
      const { count: likes } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("recipe_id", recipeId);
      setLikeCount(likes ?? 0);

      await loadComments();

      // similar by overlapping tags (same as web)
      if (rec.tags?.length) {
        const { data: sims } = await supabase
          .from("public_recipes_with_stats")
          .select("id,title,image_url,tags")
          .overlaps("tags", rec.tags)
          .neq("id", rec.id)
          .limit(10);
        setSimilar((sims ?? []) as any);
      } else {
        setSimilar([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  // ---- actions ----
  async function toggleRecipeLike() {
    if (!recipe) return;
    if (!currentUserId) return toast("Sign in first");

    if (liking) return;
    setLiking(true);

    try {
      if (isRecipeLiked) {
        await supabase.from("likes").delete().eq("user_id", currentUserId).eq("recipe_id", recipe.id);
        setIsRecipeLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await supabase.from("likes").insert({ user_id: currentUserId, recipe_id: recipe.id });
        setIsRecipeLiked(true);
        setLikeCount((c) => c + 1);
      }
    } finally {
      setLiking(false);
    }
  }

  const handleImageTap = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;

    if (delta < 260) {
      // Double tap: like the recipe
      if (!isRecipeLiked) {
        heartBurstRef.current?.burst?.();
        toggleRecipeLike();
      } else {
        // Still show animation if already liked
        heartBurstRef.current?.burst?.();
      }
    } else {
      // Single tap: do nothing (we're already on the recipe page)
      // Could add functionality like zoom or fullscreen view if desired
    }
  }, [isRecipeLiked, toggleRecipeLike]);

  async function toggleRecipeSave() {
    if (!recipe) return;
    if (!currentUserId) return toast("Sign in first");

    if (saving) return;
    setSaving(true);

    try {
      if (isRecipeSaved) {
        await supabase.from("user_added_recipes").delete().eq("user_id", currentUserId).eq("recipe_id", recipe.id);
        setIsRecipeSaved(false);
      } else {
        await supabase.from("user_added_recipes").insert({ user_id: currentUserId, recipe_id: recipe.id });
        setIsRecipeSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function postComment() {
    if (!currentUserId) return toast("Sign in first");
    const body = newComment.trim();
    if (!body) return;

    setPosting(true);
    try {
      await supabase.from("comments").insert({
        recipe_id: recipeId,
        user_id: currentUserId,
        body,
      });
      setNewComment("");
      await loadComments();
    } catch (e: any) {
      toast(e?.message ?? "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleCommentLike(commentId: number) {
    if (!currentUserId) return toast("Sign in first");

    const already = likedComments.has(commentId);

    if (already) {
      await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", currentUserId);
      setLikedComments((s) => {
        const next = new Set(s);
        next.delete(commentId);
        return next;
      });
      setCommentLikes((m) => ({ ...m, [commentId]: Math.max(0, (m[commentId] || 1) - 1) }));
    } else {
      await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: currentUserId });
      setLikedComments((s) => new Set(s).add(commentId));
      setCommentLikes((m) => ({ ...m, [commentId]: (m[commentId] || 0) + 1 }));
    }
  }

  async function deleteComment(commentId: number) {
    try {
      await supabase.from("comments").delete().eq("id", commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      toast(e?.message ?? "Delete failed");
    }
  }

  // ---- UI bits ----
  const total = totalTimeLabel(recipe?.prep_time ?? null, recipe?.cook_time ?? null);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Ionicons name="alert-circle-outline" size={26} color={theme.colors.subtext} />
          <Text style={{ marginTop: 10, color: theme.colors.subtext }}>Recipe not found.</Text>
          <View style={{ marginTop: 14, width: "100%" }}>
            <Button label="Go back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const isOwner = currentUserId && recipe.user_id === currentUserId;

  return (
    <Screen>
      <ScrollView
        ref={scrollViewRef} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
      >
        {/* HERO */}
        <View style={{ position: "relative" }}>
          <Pressable onPress={handleImageTap} style={{ position: "relative" }}>
            {heroUrl ? (
              <Image 
                source={{ uri: heroUrl }}
                style={{ 
                  width: "100%",
                  height: 220,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  height: 220,
                  width: "100%",
                  backgroundColor: theme.colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="image-outline" size={28} color={theme.colors.subtext} />
              </View>
            )}
            
            {/* Heart burst animation */}
            <HeartBurst
              ref={heartBurstRef}
            />
          </Pressable>

          {/* dark overlay */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: 16,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "900", color: "white" }} numberOfLines={2}>
              {recipe.title}
            </Text>
            {!!recipe.caption && (
              <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.9)" }} numberOfLines={2}>
                {recipe.caption}
              </Text>
            )}
          </View>

          {/* top controls */}
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.92)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#111" />
            </Pressable>

            {isOwner ? (
              <Pressable
                onPress={() => router.push({ pathname: "/tabs/create", params: { id: String(recipe.id) } })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.92)",
                }}
              >
                <Ionicons name="create-outline" size={18} color="#111" />
                <Text style={{ fontWeight: "800", color: "#111" }}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* BODY */}
        <View style={{ paddingHorizontal: theme.spacing(2), paddingTop: theme.spacing(2) }}>
          {/* Author row */}
          {author ? (
            <Pressable
              onPress={() => router.push(`/user/${author.id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: theme.spacing(2),
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  overflow: "hidden",
                  backgroundColor: theme.colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {author.avatar_url ? (
                  <Image 
                    source={{ uri: resolveImageUrl("profile-avatars", author.avatar_url) }}
                    style={{ width: 46, height: 46 }} 
                  />
                ) : (
                  <Ionicons name="person-outline" size={18} color={theme.colors.subtext} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: theme.colors.text }}>
                  {author.username ?? "Unknown Chef"}
                </Text>
                <Text style={{ marginTop: 2, color: theme.colors.subtext, fontSize: 12 }}>
                  {formatDate(recipe.created_at)}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={theme.colors.subtext} />
            </Pressable>
          ) : null}

          {/* Controls (like / save / comments count) */}
          {!isOwner ? (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: theme.spacing(2) }}>
              <Pressable
                disabled={liking}
                onPress={toggleRecipeLike}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: "white",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name={isRecipeLiked ? "heart" : "heart-outline"}
                  size={18}
                  color={isRecipeLiked ? "#e53935" : theme.colors.subtext}
                />
                <Text style={{ fontWeight: "900", color: theme.colors.text }}>{likeCount}</Text>
              </Pressable>

              <Pressable
                disabled={saving}
                onPress={toggleRecipeSave}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: "white",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name={isRecipeSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isRecipeSaved ? "#2E7D32" : theme.colors.subtext}
                />
                <Text style={{ fontWeight: "900", color: theme.colors.text }}>
                  {isRecipeSaved ? "Remove" : "Save"}
                </Text>
              </Pressable>  

              <Pressable onPress={scrollToComments}>
                <View
                  style={{
                    width: 92,
                    height: 44,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.subtext} />
                  <Text style={{ fontWeight: "900", color: theme.colors.text }}>{commentCount}</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginBottom: theme.spacing(2) }}>
              <Muted>You're viewing your own recipe.</Muted>
            </View>
          )}

          {/* Tags */}
          {recipe.tags?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recipe.tags.map((t) => (
                <Chip key={t} label={t} active={true} />
              ))}
            </ScrollView>
          ) : null}

          {/* Info chips (prep/cook/total/difficulty) */}
          {(recipe.prep_time || recipe.cook_time || total || recipe.difficulty) ? (
              <Card
                style={{ marginTop: theme.spacing(2), padding: theme.spacing(2) }}
              >
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {recipe.prep_time ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Prep:</Text>
                    <Text style={{ color: theme.colors.subtext }}>{recipe.prep_time}</Text>
                  </View>
                ) : null}
                {recipe.cook_time ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="flame-outline" size={16} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Cook:</Text>
                    <Text style={{ color: theme.colors.subtext }}>{recipe.cook_time}</Text>
                  </View>
                ) : null}
                {total ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="alarm-outline" size={16} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Total:</Text>
                    <Text style={{ color: theme.colors.subtext }}>{total}</Text>
                  </View>
                ) : null}
                {recipe.difficulty ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="speedometer-outline" size={16} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Difficulty:</Text>
                    <Text style={{ color: theme.colors.subtext }}>{recipe.difficulty}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ) : null}

          {/* Description */}
          {recipe.description ? (
            <Card style={{ marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
              <H3>Description</H3>
              <Text style={{ marginTop: 8, lineHeight: 20, color: theme.colors.text }}>{recipe.description}</Text>
            </Card>
          ) : null}

          {/* Demo video */}
          {recipe.demo_url ? (
            <Card style={{ marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
              <H3>Demo Video</H3>
              <Muted style={{ marginTop: 6 }}>
                {isYoutube(recipe.demo_url) ? "Opens YouTube" : "Opens link"}
              </Muted>

              <View style={{ marginTop: 12 }}>
                <Button
                  label="Open demo video →"
                  onPress={() => Linking.openURL(recipe.demo_url!)}
                />
              </View>
            </Card>
          ) : null}

          {/* Ingredients */}
          <Card style={{ marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
            <H3>Ingredients</H3>
            {!ingredients.length ? (
              <Muted style={{ marginTop: 10 }}>No ingredients listed.</Muted>
            ) : (
              <View style={{ marginTop: 10, gap: 8 }}>
                {ingredients.map((ing, idx) => {
                  const qty = ing.quantity != null ? String(ing.quantity) : "";
                  const unit = ing.unit_code ?? "";
                  const notes = ing.notes ? ` (${ing.notes})` : "";
                  const meta = [qty, unit].filter(Boolean).join(" ");

                  return (
                    <View
                      key={`${ing.name}-${idx}`}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: "white",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ fontSize: 18 }}>
                          {resolveIngredientEmoji(ing.name, ing.emoji)}
                        </Text>

                        <Text style={{ fontWeight: "900" }}>
                          {ing.name}
                        </Text>
                      </View>
                      {(meta || notes) ? (
                        <Text style={{ marginTop: 4, color: theme.colors.subtext }}>
                          {meta}{notes}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Steps */}
          <Card style={{ marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
            <H3>Steps</H3>
            {!steps.length ? (
              <Muted style={{ marginTop: 10 }}>No steps listed.</Muted>
            ) : (
              <View style={{ marginTop: 10, gap: 10 }}>
                {steps.map((s) => (
                  <View key={s.position} style={{ flexDirection: "row", gap: 10 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.colors.chip,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: theme.colors.text }}>{s.position}</Text>
                    </View>
                    <Text style={{ flex: 1, lineHeight: 20, color: theme.colors.text }}>{s.body}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Similar Recipes */}
          {similar.length ? (
            <View style={{ marginTop: theme.spacing(2) }}>
              <H3 style={{ marginBottom: 10 }}>Similar Recipes</H3>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {similar.map((s) => {
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => router.push(`/recipe/${s.id}`)}
                      style={{
                        width: 220,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: "white",
                        overflow: "hidden",
                      }}
                    >
                      <View style={{ height: 130, backgroundColor: theme.colors.chip }}>
                        {s.image_url ? (
                          <Image 
                            source={{ uri: resolveImageUrl("recipe-media", s.image_url) }}
                            style={{ width: "100%", height: 130 }} 
                          />
                        ) : (
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="image-outline" size={22} color={theme.colors.subtext} />
                          </View>
                        )}
                      </View>

                      <View style={{ padding: 12 }}>
                        <Text style={{ fontWeight: "900", color: theme.colors.text }} numberOfLines={2}>
                          {s.title}
                        </Text>
                        {s.tags?.length ? (
                          <Text style={{ marginTop: 6, fontSize: 12, color: theme.colors.subtext }} numberOfLines={1}>
                            {s.tags.slice(0, 3).join(" • ")}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Comments */}
          <Card ref={commentsRef} style={{ marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <H3>Comments</H3>
              <Muted>{commentCount}</Muted>
            </View>

            {/* composer */}
            {currentUserId ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 14,
                    backgroundColor: "white",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Share your thoughts…"
                    placeholderTextColor={theme.colors.subtext}
                    style={{ color: theme.colors.text, minHeight: 40 }}
                    multiline
                  />
                </View>

                <Button label={posting ? "Posting..." : "Post"} onPress={postComment} disabled={posting} />
              </View>
            ) : (
              <Muted style={{ marginTop: 10 }}>Sign in to post a comment.</Muted>
            )}

            {/* list */}
            {!comments.length ? (
              <Muted style={{ marginTop: 14 }}>No comments yet.</Muted>
            ) : (
              <View style={{ marginTop: 14, gap: 12 }}>
                {comments.map((c: CommentRow) => (
                  <CommentCard
                    key={c.id}
                    c={c}
                    liked={likedComments.has(c.id)}
                    onLike={() => toggleCommentLike(c.id)}
                    onDelete={
                      currentUserId === c.user_id
                        ? () => deleteComment(c.id)
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </Card>

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>
    </Screen>
  );
}
