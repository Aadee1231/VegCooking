// src/pages/FeedPage.tsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
};
type Profile = { id: string; username: string | null; avatar_url: string | null };

// DoorDash-style “tag” categories
const CATEGORIES = [
  { label: "All", emoji: "🍽️", tag: "ALL" },
  { label: "Vegan", emoji: "🥦", tag: "Vegan" },
  { label: "Vegetarian", emoji: "🥗", tag: "Vegetarian" },
  { label: "Gluten-Free", emoji: "🍞", tag: "Gluten-Free" },
  { label: "Dairy-Free", emoji: "🧈", tag: "Dairy-Free" },
  { label: "Healthy", emoji: "🍎", tag: "Healthy" },
  { label: "Dessert", emoji: "🍰", tag: "Dessert" },
  { label: "Comfort Food", emoji: "🍝", tag: "Comfort Food" },
];


export default function FeedPage() {
  const [items, setItems] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [liking, setLiking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    loadFeed(null);
  }, []);

async function loadFeed(tag: string | null) {
  setLoading(true);
  let query = supabase
    .from("public_recipes_with_stats")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);

  if (tag && tag !== "ALL") {
    // filter recipes containing the tag
    query = query.overlaps("tags", [tag]);
  }

  const { data, error } = await query;
  if (error) console.error(error);
  setItems((data ?? []) as Recipe[]);
  setLoading(false);

  // preload authors
  const uids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
  if (uids.length) {
    const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", uids);
    const map: Record<string, Profile> = {};
    (profs ?? []).forEach((p) => (map[p.id] = p as Profile));
    setProfileMap(map);
  }
}



  async function toggleLike(recipeId: number) {
    if (!userId) return alert("Sign in to like");
    setLiking(recipeId);
    try {
      const { error } = await supabase.from("likes").insert({ user_id: userId, recipe_id: recipeId });
      if (error) await supabase.from("likes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      const { data } = await supabase.from("public_recipes_with_stats").select("*").eq("id", recipeId).single();
      setItems((prev) => prev.map((r) => (r.id === recipeId ? (data as Recipe) : r)));
    } finally {
      setLiking(null);
    }
  }

  async function addToMyRecipes(recipeId: number) {
    if (!userId) return alert("Sign in to add");
    const { error } = await supabase.from("user_added_recipes").insert({ user_id: userId, recipe_id: recipeId });
    if (error && (error as any).code !== "23505") alert(error.message);
    else if (!error) alert("Recipe added!");
  }

  const avatarUrl = (p: string | null) =>
    p ? supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl : "/default-avatar.svg";
  const imgUrl = (p: string | null) =>
    p ? supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl : null;

  // for category scroll
  function scrollRow(dir: "left" | "right") {
    const el = document.getElementById("tag-row");
    if (el) el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  }

  return (
    <div className="fade-in" style={{ padding: "1rem 0" }}>
      {/* ---- CATEGORY SCROLLER ---- */}
      <div style={{ position: "relative", margin: "0 auto 1rem auto", maxWidth: 1000 }}>
        <button
          onClick={() => scrollRow("left")}
          style={{ position: "absolute", left: 0, top: "35%", background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ChevronLeft size={22} />
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
              className={activeTag === c.tag ? "btn" : "btn btn-secondary"}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 80,
                padding: "6px 10px",
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>{c.emoji}</span>
              <span style={{ fontSize: ".85rem", marginTop: 4 }}>{c.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollRow("right")}
          style={{ position: "absolute", right: 0, top: "35%", background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* ---- FEED ---- */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#777" }}>Loading...</p>
      ) : (
        items.map((r) => {
          const author = profileMap[r.user_id];
          return (
            <article
              key={r.id}
              className="card fade-in"
              style={{
                width: "100%",
                maxWidth: 900,
                margin: "1rem auto",
                padding: "1rem",
                borderRadius: 16,
                border: "1px solid #eee",
              }}
            >
              {/* Header */}
              {author && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={avatarUrl(author.avatar_url)}
                      alt=""
                      style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                    />
                    <strong>{author.username}</strong>
                  </div>
                  <small style={{ color: "#777" }}>{new Date(r.created_at).toLocaleDateString()}</small>
                </div>
              )}

              {r.image_url && (
                <Link to={`/r/${r.id}`}>
                  <img
                    src={imgUrl(r.image_url)!}
                    alt={r.title}
                    style={{
                      width: "100%",
                      height: 250,
                      objectFit: "cover",
                      borderRadius: 10,
                      marginTop: 8,
                    }}
                  />
                </Link>
              )}

              <h3 style={{ color: "var(--brand)", marginTop: 8 }}>
                <Link to={`/r/${r.id}`}>{r.title}</Link>
              </h3>
              {r.caption && <p style={{ color: "#555" }}>{r.caption}</p>}

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn" onClick={() => toggleLike(r.id)} disabled={liking === r.id}>
                  {liking === r.id ? "…" : "♥"} {r.likes_count}
                </button>
                <button className="btn btn-secondary" onClick={() => addToMyRecipes(r.id)}>
                  ➕ Add
                </button>
              </div>

              {r.tags && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {r.tags.map((t) => (
                    <span key={t} className="tag">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })
      )}
      {items.length === 0 && !loading && (
        <p style={{ textAlign: "center", marginTop: "2rem", color: "#777" }}>No recipes found.</p>
      )}
    </div>
  );
}
