import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Toast } from "../components/Toast";

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
  const [commentLikes, setCommentLikes] = useState<Record<number, number>>({});

  const avatarUrl = (p: string | null) =>
    p ? supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl : "/default-avatar.svg";
  const imgUrl = (p: string | null) =>
    p ? supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!id) return;
    loadRecipe();
  }, [id]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  async function loadRecipe() {
    setLoading(true);
    const { data: rec } = await supabase.from("recipes").select("*").eq("id", id).single();
    if (!rec) {
      setLoading(false);
      return;
    }
    setRecipe(rec);
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", rec.user_id)
      .single();
    setAuthor(prof);

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

    const { count: likes } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("recipe_id", id);
    setLikeCount(likes ?? 0);

    await loadComments();

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
    const { data: likesData } = await supabase.from("comment_likes").select("*");
    const likeMap: Record<number, number> = {};
    (likesData ?? []).forEach((l) => (likeMap[l.comment_id] = (likeMap[l.comment_id] || 0) + 1));
    setCommentLikes(likeMap);
  }

  async function toggleCommentLike(commentId: number) {
    if (!currentUserId) return showToast("Sign in first!");
    const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: currentUserId });
    if (error) {
      await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", currentUserId);
      setCommentLikes((m) => ({ ...m, [commentId]: Math.max(0, (m[commentId] || 1) - 1) }));
    } else {
      setCommentLikes((m) => ({ ...m, [commentId]: (m[commentId] || 0) + 1 }));
    }
  }

  async function deleteComment(commentId: number) {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((x) => x.id !== commentId));
    showToast("Comment deleted");
  }

  async function likeRecipe() {
    if (!currentUserId || !recipe) return showToast("Sign in first!");
    setLiking(true);
    try {
      const { error } = await supabase.from("likes").insert({ user_id: currentUserId, recipe_id: recipe.id });
      if (error) {
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
    } catch {
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
      await supabase.from("comments").insert({
        recipe_id: Number(id),
        user_id: currentUserId,
        body,
      });
      setNewComment("");
      await loadComments();
      showToast("Comment posted!");
    } catch {
      showToast("Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading recipe...</p>;
  if (!recipe) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Recipe not found.</p>;

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto 4rem auto" }}>
      {toast && <Toast msg={toast} />}

      {/* --- Hero --- */}
      {recipe.image_url && (
        <div
          style={{
            position: "relative",
            height: 320,
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
              filter: "brightness(80%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,.5)",
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>{recipe.title}</h1>
            {recipe.caption && <p style={{ fontSize: "1.1rem" }}>{recipe.caption}</p>}
          </div>
        </div>
      )}

      {/* --- Author Section --- */}
      {author && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "1.2rem",
          }}
        >
          <img
            src={avatarUrl(author.avatar_url)}
            alt=""
            style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }}
          />
          <div>
            <Link
              to={`/u/${author.id}`}
              style={{
                fontWeight: 600,
                color: "var(--brand)",
                textDecoration: "underline",
              }}
            >
              {author.username ?? "Unknown Chef"}
            </Link>
            <div style={{ fontSize: ".85rem", color: "#777" }}>
              {new Date(recipe.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* --- Controls --- */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
        {currentUserId === recipe.user_id ? (
          <Link to={`/edit/${recipe.id}`} className="btn">
            ✏️ Edit Recipe
          </Link>
        ) : (
          <>
            <button className="btn" disabled={liking} onClick={likeRecipe}>
              ♥ {liking ? "…" : likeCount}
            </button>
            <button className="btn btn-secondary" disabled={adding} onClick={addRecipe}>
              ➕ Add
            </button>
            <span style={{ color: "#777", alignSelf: "center", fontSize: ".9rem" }}>
              💬 {commentCount}
            </span>
          </>
        )}
      </div>

      {/* --- Info Section --- */}
      {(recipe.prep_time || recipe.cook_time || recipe.difficulty) && (
        <div
          style={{
            background: "#f9faf9",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: "1.2rem",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            fontSize: ".95rem",
          }}
        >
          {recipe.prep_time && <span>⏱ Prep: {recipe.prep_time}</span>}
          {recipe.cook_time && <span>🔥 Cook: {recipe.cook_time}</span>}
          {(recipe.prep_time || recipe.cook_time) && (
            <span>
              🕒 Total:{" "}
              {(() => {
                const extract = (s: string) => parseInt(s.replace(/[^0-9]/g, "")) || 0;
                const p = extract(recipe.prep_time || "0");
                const c = extract(recipe.cook_time || "0");
                return `${p + c} min`;
              })()}
            </span>
          )}
          {recipe.difficulty && <span>💪 Difficulty: {recipe.difficulty}</span>}
        </div>
      )}

      {/* --- Description --- */}
      {recipe.description && (
        <p style={{ marginBottom: "1.5rem", lineHeight: 1.6, color: "#444" }}>{recipe.description}</p>
      )}

      {/* --- Ingredients --- */}
      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--brand)", marginBottom: 8 }}>Ingredients</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {ingredients.map((ing, i) => (
            <li
              key={i}
              style={{
                background: "#f4f6f4",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 6,
                fontSize: ".95rem",
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

      {/* --- Steps --- */}
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

      {/* --- Similar Recipes --- */}
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
              <Link
                key={s.id}
                to={`/r/${s.id}`}
                className="card"
                style={{
                  overflow: "hidden",
                  borderRadius: 14,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
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

      {/* --- Comments Section --- */}
      <section
        className="card"
        style={{
          padding: 16,
          borderRadius: 14,
          marginTop: 28,
        }}
      >
        <h3 style={{ color: "var(--brand)", marginBottom: 10 }}>Comments ({commentCount})</h3>
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
              <div
                key={c.id}
                style={{
                  display: "flex",
                  gap: 10,
                  borderBottom: "1px solid #eee",
                  paddingBottom: 8,
                }}
              >
                <img
                  src={avatarUrl(c.profiles?.avatar_url ?? null)}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {c.profiles?.username ?? "User"}{" "}
                    <span style={{ color: "#999", fontWeight: 400, fontSize: ".85rem" }}>
                      {new Date(c.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div>{c.body}</div>
                  <div style={{ marginTop: 4, display: "flex", gap: 10 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: ".8rem", padding: "4px 8px" }}
                      onClick={() => toggleCommentLike(c.id)}
                    >
                      ♥ {commentLikes[c.id] ?? 0}
                    </button>
                    {c.user_id === currentUserId && (
                      <button
                        className="btn-danger"
                        style={{ fontSize: ".8rem", padding: "4px 8px" }}
                        onClick={() => deleteComment(c.id)}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
