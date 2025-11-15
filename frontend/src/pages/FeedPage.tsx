// src/pages/FeedPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";

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
  const [, setLiking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [likedRecipes, setLikedRecipes] = useState<number[]>([]);

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

  async function addToMyRecipes(recipeId: number, ownerId: string) {
    if (!userId) return window.vcToast("Sign in to add");
    if (ownerId === userId) return window.vcToast("You can't add your own recipe!");

    const { error } = await supabase
      .from("user_added_recipes")
      .insert({ user_id: userId, recipe_id: recipeId });

    if (error && (error as any).code !== "23505") window.vcToast("Error adding");
    else if (!error) window.vcToast("Recipe added!");
    else window.vcToast("Already added.");
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
              className={`btn-secondary ${activeTag === c.tag ? "active-tag" : ""}`}
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
                      {r.prep_time && <span>⏱ {r.prep_time}</span>}
                      {r.cook_time && <span>🔥 {r.cook_time}</span>}
                      {r.difficulty && <span>💪 {r.difficulty}</span>}
                    </div>
                  )}
                </div>

                {/* ACTION BAR */}
                <div
                  style={{
                    padding: "0.75rem 1rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #eee",
                  }}
                >
                  {/* LEFT SIDE */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

                    {/* LIKE */}
                    <div
                      onClick={() => toggleLike(r.id)}
                      className="heart-interact"
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        minWidth: 55,
                      }}
                    >
                      <Heart
                        size={22}
                        fill={likedRecipes.includes(r.id) ? "red" : "none"}
                        color={likedRecipes.includes(r.id) ? "red" : "#999"}
                        className={likedRecipes.includes(r.id) ? "heart-pop" : ""}
                      />
                      <span style={{ fontSize: ".9rem", color: "#444" }}>
                        {r.likes_count}
                      </span>
                    </div>

                    {/* ADD BUTTON */}
                    {!isOwn && (
                    <div
                        onClick={() => addToMyRecipes(r.id, r.user_id)}
                        className="action-tap"
                        style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: "var(--brand)",
                        fontWeight: 600,
                        fontSize: ".9rem",
                        }}
                    >
                        ➕ Add
                    </div>
                    )}


                    {/* COMMENTS */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        minWidth: 55,
                      }}
                    >
                      <span style={{ color: "#777", fontSize: ".95rem" }}>💬</span>
                      <span style={{ color: "#444", fontSize: ".9rem" }}>
                        {r.comments_count}
                      </span>
                    </div>
                  </div>

                  {/* AUTHOR */}
                  {author && (
                    <Link
                      to={`/u/${author.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <img
                        src={avatarUrl(author.avatar_url)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <span
                        style={{
                            color: "#555",
                            fontSize: ".88rem",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "clip",   // no ellipsis
                            maxWidth: "100%",       // allow full width
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
