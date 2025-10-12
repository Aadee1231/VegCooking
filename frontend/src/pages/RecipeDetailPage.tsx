import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

type Ingredient = {
  id: number;
  name: string;
  quantity: number | null;
  unit_code: string | null;
  notes: string | null;
};

type Step = { id: number; position: number; body: string };
type Comment = { id: number; body: string; created_at: string; profiles: Profile };

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    if (id) fetchRecipe(Number(id));
  }, [id]);

  async function fetchRecipe(recipeId: number) {
    const { data: rec, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();
    if (error) return console.error(error);
    setRecipe(rec as Recipe);

    const { data: prof } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", rec.user_id)
      .single();
    setAuthor(prof as Profile);

    const { data: ings } = await supabase
      .from("recipe_ingredients_view")
      .select("id,name,quantity,unit_code,notes")
      .eq("recipe_id", recipeId)
      .order("position");
    setIngredients(ings || []);

    const { data: st } = await supabase
      .from("recipe_steps")
      .select("id,position,body")
      .eq("recipe_id", recipeId)
      .order("position");
    setSteps(st || []);

    const { data: comm } = await supabase
      .from("comments")
      .select("id,body,created_at,profiles(id,username,avatar_url)")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });
    setComments(
      (comm || []).map((c: any) => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      }))
    );
  }

  async function postComment() {
    if (!userId) return alert("Sign in to comment.");
    if (!newComment.trim()) return;
    const { error } = await supabase
      .from("comments")
      .insert({ user_id: userId, recipe_id: recipe?.id, body: newComment });
    if (error) return alert(error.message);
    setNewComment("");
    fetchRecipe(recipe!.id);
  }

  function imgUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl;
  }

  function avatarUrl(path: string | null) {
    if (!path) return "/default-avatar.png";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }

  if (!recipe) return <p style={{ textAlign: "center" }}>Loading recipe...</p>;

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        background: "#fff",
        borderRadius: "14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      {/* === Cover Image === */}
      {recipe.image_url && (
        <img
          src={imgUrl(recipe.image_url)!}
          alt={recipe.title}
          style={{
            width: "100%",
            height: "400px",
            objectFit: "cover",
            borderBottom: "1px solid #eee",
          }}
        />
      )}

      {/* === Content === */}
      <div style={{ padding: "24px" }}>
        <h2 style={{ marginBottom: "6px", color: "#2e7d32" }}>{recipe.title}</h2>
        {recipe.caption && (
          <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: "12px" }}>
            {recipe.caption}
          </p>
        )}

        {/* === Author === */}
        {author && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <img
              src={avatarUrl(author.avatar_url)!}
              alt={author.username ?? ""}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            <div>
              <strong>{author.username ?? "Unknown cook"}</strong>
              <div style={{ fontSize: "0.85rem", color: "#777" }}>
                {new Date(recipe.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* === Tags === */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {recipe.tags.map((tag) => (
              <Link
                key={tag}
                to={`/?tag=${encodeURIComponent(tag)}`}
                style={{
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* === Ingredients === */}
        <section style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ color: "#2e7d32", marginBottom: "10px" }}>Ingredients</h3>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {ingredients.length > 0 ? (
              ingredients.map((ing) => (
                <li
                  key={ing.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.95rem",
                  }}
                >
                  <span>
                    {ing.quantity ?? ""} {ing.unit_code ?? ""} {ing.name}
                  </span>
                  {ing.notes && (
                    <span style={{ color: "#777", fontSize: "0.85rem" }}>
                      {ing.notes}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <p style={{ color: "#777", fontSize: "0.9rem" }}>
                No ingredients listed for this recipe.
              </p>
            )}
          </ul>
        </section>

        {/* === Steps === */}
        <section style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ color: "#2e7d32", marginBottom: "10px" }}>Steps</h3>
          <ol style={{ paddingLeft: "1.2rem" }}>
            {steps.length > 0 ? (
              steps.map((s) => (
                <li
                  key={s.id}
                  style={{
                    marginBottom: "0.9rem",
                    lineHeight: "1.5",
                    color: "#333",
                  }}
                >
                  {s.body}
                </li>
              ))
            ) : (
              <p style={{ color: "#777", fontSize: "0.9rem" }}>No steps added yet.</p>
            )}
          </ol>
        </section>

        {/* === Description === */}
        {recipe.description && (
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ color: "#2e7d32", marginBottom: "10px" }}>Description</h3>
            <p style={{ color: "#555", lineHeight: "1.6" }}>{recipe.description}</p>
          </section>
        )}

        {/* === Comments === */}
        <section>
          <h3 style={{ color: "#2e7d32", marginBottom: "10px" }}>Comments</h3>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "12px",
              alignItems: "center",
            }}
          >
            <input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "0.95rem",
              }}
            />
            <button className="btn" onClick={postComment}>
              Post
            </button>
          </div>

          {comments.length === 0 && (
            <p style={{ color: "#777" }}>No comments yet. Be the first!</p>
          )}

          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              {c.profiles?.avatar_url && (
                <img
                  src={avatarUrl(c.profiles.avatar_url)!}
                  alt=""
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginTop: "2px",
                  }}
                />
              )}
              <div>
                <strong>{c.profiles?.username ?? "Anonymous"}</strong>
                <p style={{ margin: "4px 0", fontSize: "0.95rem" }}>{c.body}</p>
                <small style={{ color: "#777" }}>
                  {new Date(c.created_at).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
