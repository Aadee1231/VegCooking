// src/pages/FeedPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import {
  Heart,
  BookmarkSimple,
  X,
  Trash,
  PencilSimple,
  Clock,
  Fire,
  Gauge,
  MapPin,
  CaretLeft,
  CaretRight,
  ChatCircleDots,
} from "phosphor-react";




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
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [, setLiking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [likedRecipes, setLikedRecipes] = useState<number[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<number[]>([]);


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);

      await loadFeed([]);
      if (uid) {
         await loadUserLikes(uid);
        await loadUserSaved(uid);
      } 
    })();
  }, []);

  async function loadUserLikes(uid: string) {
    const { data } = await supabase
      .from("likes")
      .select("recipe_id")
      .eq("user_id", uid);

    setLikedRecipes((data ?? []).map((r) => r.recipe_id));
  }

  async function loadUserSaved(uid: string) {
  const { data } = await supabase
    .from("user_added_recipes")
    .select("recipe_id")
    .eq("user_id", uid);

  setSavedRecipes((data ?? []).map((r) => r.recipe_id));
}


  async function loadFeed(tags: string[]) {
    setLoading(true);

    let query = supabase
      .from("public_recipes_with_stats")
      .select("*, prep_time, cook_time, difficulty")
      .order("created_at", { ascending: false })
      .limit(60);

    const realTags = tags.filter((t) => t !== "ALL");

    if (realTags.length > 0) {
        query = query.overlaps("tags", realTags);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    setItems((data ?? []) as Recipe[]);
    setLoading(false);

    // Load authors
    const uids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    if (uids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", uids);

      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p as Profile));
      setProfileMap(map);
    }
  }

  async function toggleLike(recipeId: number) {
    if (!userId) return window.vcToast("Sign in to like");

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
        window.vcToast("Like removed ❤️‍🩹");
      } else {
        await supabase.from("likes").insert({ user_id: userId, recipe_id: recipeId });
        setLikedRecipes((prev) => [...prev, recipeId]);
        window.vcToast("Liked ❤️");
      }

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

  async function toggleSaveRecipe(recipeId: number, ownerId: string) {
    if (!userId) return window.vcToast("Sign in to add");
    if (ownerId === userId)
        return window.vcToast("You can't add your own recipe!");

    const alreadySaved = savedRecipes.includes(recipeId);

    if (alreadySaved) {
        const { error } = await supabase
        .from("user_added_recipes")
        .delete()
        .eq("user_id", userId)
        .eq("recipe_id", recipeId);

        if (error) {
        window.vcToast("Error removing");
        } else {
        setSavedRecipes((prev) => prev.filter((id) => id !== recipeId));
        window.vcToast("Recipe removed from Saved");
        }
    } else {
        const { error } = await supabase
        .from("user_added_recipes")
        .insert({ user_id: userId, recipe_id: recipeId });

        if (error && (error as any).code !== "23505") {
        window.vcToast("Error adding");
        } else {
        setSavedRecipes((prev) =>
            prev.includes(recipeId) ? prev : [...prev, recipeId]
        );
        window.vcToast("Recipe saved!");
        }
    }
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
      
      {/* CATEGORY SCROLLER */}
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
          <CaretLeft size={18} />
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
                if (c.tag === "ALL") {
                setActiveTags([]);
                void loadFeed([]);
                } else {
                setActiveTags((prev) => {
                    const exists = prev.includes(c.tag);
                    const next = exists
                    ? prev.filter((t) => t !== c.tag)
                    : [...prev, c.tag];
                    void loadFeed(next);
                    return next;
                });
                }
            }}
            className={`btn-secondary ${
                c.tag === "ALL"
                ? activeTags.length === 0
                    ? "active-tag"
                    : ""
                : activeTags.includes(c.tag)
                ? "active-tag"
                : ""
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
          <CaretRight size={18} />
        </button>
      </div>

      {/* FEED GRID */}
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
                className="feed-card fade-in"
                style={{
                  minHeight: 430, // ENSURES EVERY CARD IS THE SAME HEIGHT
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  transition: "transform .25s ease, box-shadow .25s ease",
                }}
              >
                {/* IMAGE */}
                <Link to={`/r/${r.id}`} style={{ position: "relative", display: "block" }}>
                  {savedRecipes.includes(r.id) && !isOwn && (
                    <div className="saved-ribbon">SAVED!</div>
                  )}

                  <img
                    src={imgUrl(r.image_url)!}
                    alt={r.title}
                    style={{
                      width: "100%",
                      height: 210,
                      objectFit: "cover",
                      transition: "transform .35s ease",
                    }}
                    className="card-img"
                  />
                  {/* GRADIENT */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      width: "100%",
                      height: "40%",
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.32) 100%)",
                    }}
                  />
                </Link>

                {/* BODY */}
                <div style={{ padding: "1rem" }}>
                  <h3
                    style={{
                      color: "var(--brand)",
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    <Link to={`/r/${r.id}`}>{r.title}</Link>
                  </h3>

                  {r.caption && (
                    <p style={{ color: "#555", fontSize: ".9rem", marginBottom: 8 }}>
                      {r.caption}
                    </p>
                  )}

                  {/* TAGS */}
                  <div
                    style={{
                      minHeight: r.tags?.length ? "auto" : "24px",
                      marginBottom: 8,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {(r.tags ?? []).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="tag-chip"
                        style={{
                          background: "var(--brand-50)",
                          color: "var(--brand)",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: ".75rem",
                          fontWeight: 600,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* META */}
                  {(r.prep_time || r.cook_time || r.difficulty) && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        color: "#777",
                        fontSize: ".8rem",
                      }}
                    >
                      {r.prep_time && <span><Clock size={14} /> {r.prep_time}</span>}
                      {r.cook_time && <span><Fire size={14} /> {r.cook_time}</span>}
                      {r.difficulty && <span><Gauge size={14} /> {r.difficulty}</span>}
                    </div>
                  )}
                </div>

                  
                {/* ACTION BAR */}
                <div
                style={{
                    padding: "0.6rem 0.8rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid #eee",
                    gap: 8,
                }}
                >
                {/* LEFT ACTIONS */}
                <div
                    style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: ".9rem",
                    flexShrink: 0,
                    }}
                >
                    {/* LIKE */}
                    <div
                    onClick={() => toggleLike(r.id)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                    }}
                    >
                    <Heart
                        size={18}
                        weight={likedRecipes.includes(r.id) ? "fill" : "regular"}
                        color={likedRecipes.includes(r.id) ? "#e53935" : "#555"}
                    />
                    {r.likes_count}
                    </div>

                    {/* ADD / REMOVE */}
                    {!isOwn && (
                    <div
                        onClick={() => toggleSaveRecipe(r.id, r.user_id)}
                        style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                        fontWeight: 600,
                        color: savedRecipes.includes(r.id)
                            ? "var(--danger)"
                            : "var(--brand)",
                        }}
                    >
                        {savedRecipes.includes(r.id) ? (
                        <>
                            <X size={16} /> Remove
                        </>
                        ) : (
                        <>
                            <BookmarkSimple size={16} /> Add
                        </>
                        )}
                    </div>
                    )}

                    {/* COMMENTS */}
                    <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "#555",
                    }}
                    >
                    <ChatCircleDots size={18} />
                    {r.comments_count}
                    </div>
                </div>

                {/* AUTHOR */}
                {author && (
                    <Link
                    to={`/u/${author.id}`}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0,
                    }}
                    >
                    <img
                        src={avatarUrl(author.avatar_url)}
                        style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        }}
                    />
                    <span
                        style={{
                        fontSize: ".85rem",
                        fontWeight: 500,
                        color: "#444",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 90,
                        }}
                    >
                        {author.username}
                    </span>
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
