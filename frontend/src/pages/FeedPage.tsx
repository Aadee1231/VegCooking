// src/pages/FeedPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Toast } from "../components/Toast";

type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  tags?: string[] | null;
  prep_time?: string | null;
  cook_time?: string | null;
  difficulty?: string | null;
};

type Profile = { id: string; username: string | null; avatar_url: string | null };


const CATEGORIES = [
  { label: "All", emoji: "🍽️", tag: "ALL" },
  { label: "Vegan", emoji: "🥦", tag: "Vegan" },
  { label: "Vegetarian", emoji: "🥗", tag: "Vegetarian" },
  { label: "Gluten-Free", emoji: "🍞", tag: "Gluten-Free" },
  { label: "Dairy-Free", emoji: "🧈", tag: "Dairy-Free" },
  { label: "Healthy", emoji: "🍎", tag: "Healthy" },
  { label: "Dessert", emoji: "🍰", tag: "Dessert" },
  { label: "Comfort Food", emoji: "🍝", tag: "Comfort Food" },
  { label: "Quick", emoji: "⚡", tag: "Quick" },
  { label: "Breakfast", emoji: "🥐", tag: "Breakfast" },
  { label: "Dinner", emoji: "🍛", tag: "Dinner" },
  { label: "Spicy", emoji: "🌶️", tag: "Spicy" },
];

export default function FeedPage() {
  const [items, setItems] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [liking, setLiking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [likedRecipes, setLikedRecipes] = useState<number[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

    useEffect(() => {
    (async () => {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        setUserId(uid);
        await loadFeed(null);
        if (uid) await loadUserLikes(uid);
    })();
    }, []);

    async function loadUserLikes(uid: string) {
        const { data } = await supabase
            .from("likes")
            .select("recipe_id")
            .eq("user_id", uid);
        setLikedRecipes((data ?? []).map((r) => r.recipe_id));
    }

  async function loadFeed(tag: string | null) {
    setLoading(true);
    let query = supabase
      .from("public_recipes_with_stats")
      .select("*, prep_time, cook_time, difficulty")
      .order("created_at", { ascending: false })
      .limit(60);

    if (tag && tag !== "ALL") query = query.overlaps("tags", [tag]);

    const { data, error } = await query;
    if (error) console.error(error);
    setItems((data ?? []) as Recipe[]);
    setLoading(false);

    const uids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    if (uids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", uids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p as Profile));
      setProfileMap(map);
    }
  }

  async function toggleLike(recipeId: number) {
    if (!userId) return showToast("Sign in to like");
    setLiking(recipeId);
    try {
        const alreadyLiked = likedRecipes.includes(recipeId);

        if (alreadyLiked) {
        await supabase
            .from("likes")
            .delete()
            .eq("user_id", userId)
            .eq("recipe_id", recipeId);
        setLikedRecipes((prev) => prev.filter((id) => id !== recipeId));
        showToast("Like removed ❤️‍🩹");
        } else {
        await supabase.from("likes").insert({ user_id: userId, recipe_id: recipeId });
        setLikedRecipes((prev) => [...prev, recipeId]);
        showToast("Liked ❤️");
        }

        // Update recipe stats
        const { data } = await supabase
        .from("public_recipes_with_stats")
        .select("*") 
        .eq("id", recipeId)
        .single();
        setItems((prev) =>
        prev.map((r) => (r.id === recipeId ? (data as Recipe) : r))
        );
    } finally {
        setLiking(null);
    }
  }


  async function addToMyRecipes(recipeId: number, ownerId: string) {
    if (!userId) return showToast("Sign in to add");
    if (ownerId === userId) return showToast("You can't add your own recipe!");
    const { error } = await supabase
      .from("user_added_recipes")
      .insert({ user_id: userId, recipe_id: recipeId });
    if (error && (error as any).code !== "23505") showToast("Error adding recipe");
    else if (!error) showToast("Recipe added!");
    else showToast("Already added.");
  }

  const avatarUrl = (p: string | null) =>
    p
      ? supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl
      : "/default-avatar.svg";
  const imgUrl = (p: string | null) =>
    p
      ? supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl
      : null;

  function scrollRow(dir: "left" | "right") {
    const el = document.getElementById("tag-row");
    if (el) el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  }

  return (
    <div className="fade-in" style={{ padding: "1rem 0" }}>
      {toast && <Toast msg={toast} />}

      {/* ---- CATEGORY SCROLLER ---- */}
      <div
        style={{
          position: "relative",
          margin: "0 auto 1rem auto",
          maxWidth: 1000,
          padding: "0 1rem",
        }}
      >
        <button
          onClick={() => scrollRow("left")}
          className="btn-secondary"
          style={{
            position: "absolute",
            left: 0,
            top: "40%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div
          id="tag-row"
          style={{
            display: "flex",
            overflowX: "auto",
            scrollbarWidth: "none",
            gap: "0.8rem",
            padding: "0.5rem 2rem",
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              onClick={() => {
                setActiveTag(c.tag);
                loadFeed(c.tag);
              }}
              className={`btn-secondary ${
                activeTag === c.tag ? "active-tag" : ""
              }`}
              style={{
                minWidth: 90,
                borderRadius: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontSize: ".8rem",
                padding: "8px 12px",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollRow("right")}
          className="btn-secondary"
          style={{
            position: "absolute",
            right: 0,
            top: "40%",
            transform: "translateY(-50%)",
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ---- FEED ---- */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#777" }}>Loading...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            padding: "0 1rem",
            maxWidth: 1000,
            margin: "0 auto",
          }}
        >
          {items.map((r) => {
            const author = profileMap[r.user_id];
            const isOwn = r.user_id === userId;
            return (
              <article
                key={r.id}
                className="card fade-in"
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "var(--shadow-md)",
                  transition: "transform .2s ease",
                }}
              >
                <Link to={`/r/${r.id}`} style={{ position: "relative" }}>
                  {r.image_url && (
                    <img
                      src={imgUrl(r.image_url)!}
                      alt={r.title}
                      style={{
                        width: "100%",
                        height: 220,
                        objectFit: "cover",
                        transition: "transform .3s ease",
                      }}
                    />
                  )}
                </Link>

                <div style={{ padding: "1rem" }}>
                  <h3
                    style={{
                      color: "var(--brand)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  >
                    <Link to={`/r/${r.id}`}>{r.title}</Link>
                  </h3>
                  {r.caption && (
                    <p style={{ color: "#555", fontSize: ".9rem", marginTop: 4 }}>
                      {r.caption}
                    </p>
                  )}

                  {(r.prep_time || r.cook_time || r.difficulty) && (
                    <div
                      style={{
                        fontSize: ".85rem",
                        color: "#777",
                        marginTop: 6,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {r.prep_time && <span>⏱ {r.prep_time}</span>}
                      {r.cook_time && <span>🔥 {r.cook_time}</span>}
                      {r.difficulty && <span>💪 {r.difficulty}</span>}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "0 1rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => toggleLike(r.id)}
                      disabled={liking === r.id}
                      style={{ padding: "6px 10px" }}
                    >
                      <Heart
                        size={16}
                        fill={liking === r.id ? "var(--brand)" : "none"}
                        color="white"
                      />{" "}
                      {r.likes_count}
                    </button>
                    {!isOwn && (
                      <button
                        className="btn-secondary"
                        onClick={() => addToMyRecipes(r.id, r.user_id)}
                        style={{ padding: "6px 10px" }}
                      >
                        ➕ Add
                      </button>
                    )}
                    <span style={{ color: "#777", fontSize: "1rem" }}>💬 {r.comments_count ?? 0}</span>
                  </div>

                  {author && (
                    <Link
                      to={`/u/${author.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: ".85rem",
                      }}
                    >
                      <img
                        src={avatarUrl(author.avatar_url)}
                        alt=""
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <span style={{ color: "#555" }}>{author.username}</span>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "2rem", color: "#777" }}>
          No recipes found.
        </p>
      )}
    </div>
  );
}
