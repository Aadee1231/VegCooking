import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useSearchParams } from "react-router-dom";

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

export default function FeedPage() {
  const [items, setItems] = useState<Recipe[]>([]);
  const [liking, setLiking] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [searchParams] = useSearchParams();
  const tagFilter = searchParams.get("tag");

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setUserId(session.session?.user?.id ?? null);

      let query = supabase
        .from("public_recipes_with_stats")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (tagFilter) query = query.contains("tags", [tagFilter]);

      const { data, error } = await query;
      if (error) return console.error(error);
      setItems((data ?? []) as any);

      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,avatar_url")
          .in("id", userIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p) => (map[p.id] = p as any));
        setProfileMap(map);
      }
    })();
  }, [tagFilter]);

  async function toggleLike(recipeId: number) {
    if (!userId) return alert("Sign in to like");
    setLiking(recipeId);
    try {
      const { error } = await supabase.from("likes").insert({ user_id: userId, recipe_id: recipeId });
      if (error) {
        await supabase.from("likes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      }
      const { data } = await supabase
        .from("public_recipes_with_stats")
        .select("*")
        .eq("id", recipeId)
        .single();
      setItems((prev) => prev.map((it) => (it.id === recipeId ? (data as Recipe) : it)));
    } finally {
      setLiking(null);
    }
  }

  async function addToMyRecipes(recipeId: number) {
    if (!userId) return alert("Sign in to add recipes");
    const { error } = await supabase.from("user_added_recipes").insert({ user_id: userId, recipe_id: recipeId });
    if (error) {
      if ((error as any).code === "23505") alert("Already added");
      else alert(error.message);
    } else alert("Recipe added to your account!");
  }

  function imgUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl;
  }
  function avatarUrl(path: string | null) {
    if (!path) return "/default-avatar.png";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="feed-grid">
      {tagFilter && (
        <div style={{ marginBottom: "1rem", textAlign: "center" }}>
          <h3 style={{ color: "#2e7d32" }}>
            Showing recipes tagged with <span style={{ fontWeight: 700 }}>#{tagFilter}</span>
          </h3>
          <Link to="/" style={{ fontSize: ".9rem", color: "#1565c0" }}>Clear filter</Link>
        </div>
      )}

      {items.map((r) => {
        const author = profileMap[r.user_id];
        return (
          <article key={r.id} className="recipe-card fade-in">
            {/* Author */}
            {author && (
              <div className="author">
                <Link to={`/u/${author.id}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={avatarUrl(author.avatar_url)!} alt="" />
                  <div>
                    <span className="name" style={{ fontWeight: 700 }}>
                      {author.username ?? "Unknown cook"}
                    </span>
                    <div style={{ fontSize: ".8rem", color: "#777" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Image */}
            {r.image_url && (
              <img
                src={imgUrl(r.image_url)!}
                alt={r.title}
                style={{ width: "100%", borderRadius: "12px", objectFit: "cover", marginTop: 10, border: "1px solid #eee" }}
              />
            )}

            {/* Title & Caption */}
            <div className="recipe-card-content" style={{ marginTop: 10 }}>
              <h3><Link to={`/r/${r.id}`}>{r.title}</Link></h3>
              {r.caption && <p style={{ marginTop: 6 }}>{r.caption}</p>}
            </div>

            {/* Buttons */}
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn" onClick={() => toggleLike(r.id)} disabled={liking === r.id}>
                {liking === r.id ? "…" : "♥"} {r.likes_count}
              </button>
              <button className="btn btn-secondary" onClick={() => addToMyRecipes(r.id)}>➕ Add</button>
            </div>

            {/* Tags */}
            {r.tags && (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.tags.map((tag) => (
                  <Link key={tag} to={`/?tag=${encodeURIComponent(tag)}`} className="tag">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </article>
        );
      })}

      {items.length === 0 && (
        <p style={{ color: "#777", textAlign: "center", marginTop: "2rem" }}>No recipes yet!</p>
      )}
    </div>
  );
}
