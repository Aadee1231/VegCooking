import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

/* ---------- Types ---------- */
type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  tags?: string[] | null;
};

type Profile = { id: string; username: string | null; avatar_url: string | null };
type Ingredient = { name: string; quantity: number | null; unit_code: string | null; notes: string | null };
type Step = { position: number; body: string };
type CommentRow = {
  id: number;
  body: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
};

/* ---------- Toast component ---------- */
function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "var(--brand)",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,.2)",
        animation: "fadeIn .3s ease both",
        zIndex: 9999,
      }}
    >
      {msg}
    </div>
  );
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [similar, setSimilar] = useState<Partial<Recipe>[]>([]);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [commentCount, setCommentCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string>("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const avatarUrl = (p: string | null) =>
    p ? supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl : "/default-avatar.svg";
  const imgUrl = (p: string | null) =>
    p ? supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl : null;

  /* ---------- Init ---------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!id) return;
    loadRecipe();
  }, [id]);

  /* ---------- Toast helper ---------- */
  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  /* ---------- Load all ---------- */
  async function loadRecipe() {
    setLoading(true);

    const { data: rec } = await supabase.from("recipes").select("*").eq("id", id).single();
    if (!rec) {
      setLoading(false);
      return;
    }
    setRecipe(rec);

    // author
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", rec.user_id)
      .single();
    setAuthor(prof);

    // ingredients + steps
    const [{ data: ing }, { data: st }] = await Promise.all([
      supabase
        .from("recipe_ingredients")
        .select("quantity,unit_code,notes,ingredients(name)")
        .eq("recipe_id", id)
        .order("position"),
      supabase.from("recipe_steps").select("position,body").eq("recipe_id", id).order("position"),
    ]);

    setIngredients(
      (ing ?? []).map((r: any) => ({
        name: r.ingredients?.name,
        quantity: r.quantity,
        unit_code: r.unit_code,
        notes: r.notes,
      }))
    );
    setSteps(st ?? []);

    // counts
    const { count: likes } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("recipe_id", id);
    setLikeCount(likes ?? 0);

    await loadComments();

    // similar
    if (rec.tags?.length) {
      const { data: sims } = await supabase
        .from("public_recipes_with_stats")
        .select("id,title,image_url,tags")
        .overlaps("tags", rec.tags)
        .neq("id", rec.id)
        .limit(6);
      setSimilar(sims ?? []);
    }

    setLoading(false);
  }

  async function loadComments() {
    const { data, count } = await supabase
      .from("comments")
      .select("id,body,created_at,user_id,profiles(username,avatar_url)", { count: "exact" })
      .eq("recipe_id", id)
      .order("created_at", { ascending: false });
    setComments((data ?? []) as any);
    setCommentCount(count ?? 0);
  }

  /* ---------- Actions ---------- */
  async function likeRecipe() {
    if (!currentUserId || !recipe) return showToast("Sign in first!");
    setLiking(true);
    try {
      const { error } = await supabase.from("likes").insert({ user_id: currentUserId, recipe_id: recipe.id });
      if (error) {
        // toggle off if already liked
        await supabase.from("likes").delete().eq("user_id", currentUserId).eq("recipe_id", recipe.id);
        setLikeCount((c) => Math.max(0, c - 1));
        showToast("Like removed");
      } else {
        setLikeCount((c) => c + 1);
        showToast("Liked!");
      }
    } finally {
      setLiking(false);
    }
  }

  async function addRecipe() {
    if (!currentUserId || !recipe) return showToast("Sign in first!");
    if (recipe.user_id === currentUserId) return showToast("You can’t add your own recipe!");
    setAdding(true);
    try {
      const { error } = await supabase
        .from("user_added_recipes")
        .insert({ user_id: currentUserId, recipe_id: recipe.id });
      if (error && (error as any).code !== "23505") throw error;
      showToast("Recipe added to your account!");
    } catch (e: any) {
      showToast("Already added.");
    } finally {
      setAdding(false);
    }
  }

  async function postComment() {
    if (!currentUserId) return showToast("Sign in first!");
    const body = newComment.trim();
    if (!body) return;
    setPosting(true);
    try {
      await supabase.from("comments").insert({ recipe_id: Number(id), user_id: currentUserId, body });
      setNewComment("");
      await loadComments();
      showToast("Comment posted!");
    } catch {
      showToast("Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  /* ---------- Render ---------- */
  if (loading) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading recipe...</p>;
  if (!recipe) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Recipe not found.</p>;

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto 4rem auto" }}>
      {toast && <Toast msg={toast} />}

      {/* Hero */}
      {recipe.image_url && (
        <div
          style={{
            position: "relative",
            height: 300,
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: "1.5rem",
            boxShadow: "0 6px 16px rgba(0,0,0,.15)",
          }}
        >
          <img
            src={imgUrl(recipe.image_url)!}
            alt={recipe.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(85%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              color: "white",
              textShadow: "0 1px 3px rgba(0,0,0,.5)",
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>{recipe.title}</h1>
            {recipe.caption && <p style={{ fontSize: "1.1rem" }}>{recipe.caption}</p>}
          </div>
        </div>
      )}

      {/* Author */}
      {author && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
          <img
            src={avatarUrl(author.avatar_url)}
            alt=""
            style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover" }}
          />
          <div>
            <Link to={`/u/${author.id}`} style={{ fontWeight: 600, color: "var(--brand)", textDecoration: "underline" }}>
              {author.username ?? "Unknown Chef"}
            </Link>
            <div style={{ fontSize: ".9rem", color: "#777" }}>
              {new Date(recipe.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {currentUserId === recipe.user_id ? (
        <Link
          to={`/edit/${recipe.id}`}
          className="btn"
          style={{ display: "inline-block", marginBottom: 10 }}
        >
          ✏️ Edit Recipe
        </Link>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button className="btn" disabled={liking} onClick={likeRecipe}>
            ♥ {liking ? "…" : likeCount}
          </button>
          <button className="btn btn-secondary" disabled={adding} onClick={addRecipe}>
            ➕ Add
          </button>
          <span style={{ color: "#777", alignSelf: "center", fontSize: ".9rem" }}>
            💬 {commentCount}
          </span>
        </div>
      )}

      {/* Description */}
      {recipe.description && (
        <p style={{ marginBottom: "1.5rem", lineHeight: 1.6 }}>{recipe.description}</p>
      )}

      {/* Ingredients */}
      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--brand)", marginBottom: 8 }}>Ingredients</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {ingredients.map((ing, i) => (
            <li
              key={i}
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <strong>{ing.name}</strong>{" "}
              {ing.quantity && <span>{ing.quantity}</span>}{" "}
              {ing.unit_code && <span>{ing.unit_code}</span>}{" "}
              {ing.notes && <em>({ing.notes})</em>}
            </li>
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--brand)", marginBottom: 8 }}>Steps</h3>
        <ol style={{ lineHeight: 1.6, paddingLeft: "1.2rem" }}>
          {steps.map((s) => (
            <li key={s.position} style={{ marginBottom: 6 }}>
              {s.body}
            </li>
          ))}
        </ol>
      </section>

      {/* Comments */}
      <section className="card" style={{ padding: 16, borderRadius: 14 }}>
        <h3 style={{ color: "var(--brand)", marginBottom: 10 }}>
          Comments ({commentCount})
        </h3>
        {currentUserId && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts…"
              style={{ flex: 1 }}
            />
            <button className="btn" onClick={postComment} disabled={posting}>
              {posting ? "…" : "Post"}
            </button>
          </div>
        )}
        {comments.length === 0 ? (
          <p style={{ color: "#777" }}>No comments yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
                <img
                  src={avatarUrl(c.profiles?.avatar_url ?? null)}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {c.profiles?.username ?? "User"}{" "}
                    <span style={{ color: "#999", fontWeight: 400, fontSize: ".85rem" }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div>{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Similar */}
      {similar.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ color: "var(--brand)", marginBottom: "0.6rem" }}>Similar Recipes</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {similar.map((s) => (
              <Link key={s.id} to={`/r/${s.id}`} className="card" style={{ overflow: "hidden" }}>
                {s.image_url && (
                  <img
                    src={imgUrl(s.image_url)!}
                    alt={s.title}
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      borderBottom: "1px solid #eee",
                    }}
                  />
                )}
                <div style={{ padding: "10px" }}>
                  <h4 style={{ fontWeight: 600 }}>{s.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
