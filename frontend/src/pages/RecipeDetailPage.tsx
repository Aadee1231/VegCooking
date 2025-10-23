// src/pages/RecipeDetailPage.tsx
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

// Preview shape returned by the "similar" query (fewer fields than full Recipe)
type RecipePreview = {
  id: number;
  title: string;
  image_url: string | null;
  tags?: string[] | null;
};

type Ingredient = { name: string; quantity: number | null; unit_code: string | null; notes: string | null };
type Step = { position: number; body: string };
type Profile = { id: string; username: string | null; avatar_url: string | null };

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [similar, setSimilar] = useState<RecipePreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper for public URL
  const imgUrl = (p: string | null) =>
    p ? supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl : null;
  const avatarUrl = (p: string | null) =>
    p ? supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl : "/default-avatar.svg";

  useEffect(() => {
    if (!id) return;
    loadRecipe();
  }, [id]);

  async function loadRecipe() {
    setLoading(true);

    // main recipe
    const { data: rec } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();
    if (!rec) return;
    setRecipe(rec as Recipe);

    // author
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", rec.user_id)
      .single();
    setAuthor(prof as Profile);

    // ingredients
    const { data: ing } = await supabase
      .from("recipe_ingredients")
      .select("quantity,unit_code,notes,ingredients(name)")
      .eq("recipe_id", id)
      .order("position");
    setIngredients(
      (ing ?? []).map((r: any) => ({
        name: r.ingredients?.name,
        quantity: r.quantity,
        unit_code: r.unit_code,
        notes: r.notes,
      }))
    );

    // steps
    const { data: st } = await supabase
      .from("recipe_steps")
      .select("position,body")
      .eq("recipe_id", id)
      .order("position");
    setSteps(st ?? []);

    // similar recipes (shared tags)
    if (rec.tags && rec.tags.length) {
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

  if (loading) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading recipe...</p>;
  if (!recipe) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Recipe not found.</p>;

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto 4rem auto" }}>
      {/* Hero Image */}
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
            <Link to={`/u/${author.id}`} style={{ fontWeight: 600, color: "var(--brand)" }}>
              {author.username ?? "Unknown Chef"}
            </Link>
            <div style={{ fontSize: ".9rem", color: "#777" }}>
              {new Date(recipe.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1.5rem" }}>
          {recipe.tags.map((t) => (
            <Link
              key={t}
              to={`/?tag=${encodeURIComponent(t)}`}
              className="tag"
              style={{
                background: "rgba(76,175,80,0.15)",
                color: "#2e7d32",
                padding: "6px 10px",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* Description */}
      {recipe.description && (
        <p style={{ marginBottom: "1.5rem", lineHeight: 1.6 }}>{recipe.description}</p>
      )}

      {/* Ingredients */}
      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--brand)", marginBottom: "0.6rem" }}>Ingredients</h3>
        {ingredients.length === 0 ? (
          <p style={{ color: "#777" }}>No ingredients listed.</p>
        ) : (
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
        )}
      </section>

      {/* Steps */}
      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--brand)", marginBottom: "0.6rem" }}>Steps</h3>
        {steps.length === 0 ? (
          <p style={{ color: "#777" }}>No steps added yet.</p>
        ) : (
          <ol style={{ lineHeight: 1.6, paddingLeft: "1.2rem" }}>
            {steps.map((s) => (
              <li key={s.position} style={{ marginBottom: 6 }}>
                {s.body}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Similar Recipes */}
      {similar.length > 0 && (
        <section>
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
