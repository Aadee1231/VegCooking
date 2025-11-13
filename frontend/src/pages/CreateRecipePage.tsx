import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  createIngredient,
  deleteIngredient as apiDeleteIngredient,
  searchIngredients,
  type IngredientRow,
} from "../lib/ingredients";
import { useNavigate, useParams } from "react-router-dom";

/* ---------- Toast ---------- */
function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--brand)",
        color: "#fff",
        padding: "14px 18px",
        borderRadius: 14,
        boxShadow: "0 10px 24px rgba(0,0,0,.25)",
        fontWeight: 700,
        zIndex: 9999,
      }}
    >
      {msg}
    </div>
  );
}

/* ---------- Types ---------- */
type Step = { position: number; body: string };
type Line = {
  position: number;
  ingredient?: IngredientRow | null;
  quantity?: number | null;
  unit_code?: string | null;
  notes?: string | null;
};
const UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "pc"];
const TAG_OPTIONS = [
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "Dairy-Free",
  "Healthy",
  "Dessert",
  "Comfort Food",
  "Quick",
  "Breakfast",
  "Dinner",
  "Spicy",
];

/* ---------- Ingredient Combo ---------- */
function IngredientCombo({
  value,
  onPick,
  currentUserId,
}: {
  value: IngredientRow | null | undefined;
  onPick: (row: IngredientRow) => void;
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value?.name ?? "");
  const [items, setItems] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setQ(value?.name ?? ""), [value?.id, value?.name]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      if (!q.trim()) return setItems([]);
      setLoading(true);
      try {
        setItems(await searchIngredients(q.trim()));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    function click(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        inputRef.current !== e.target
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, [open]);

  async function addNew() {
    const name = q.trim();
    if (!name) return;
    try {
      onPick(await createIngredient(name));
      setOpen(false);
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <input
        ref={inputRef}
        placeholder="Search or add ingredient…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={inputStyle}
      />
      {open && (
        <div
          ref={panelRef}
          className="card"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "105%",
            left: 0,
            right: 0,
            maxHeight: 240,
            overflow: "auto",
            marginTop: 6,
            borderRadius: 10,
            boxShadow: "0 8px 20px rgba(0,0,0,.1)",
            background: "#fff",
          }}
        >
          {loading ? (
            <div style={{ padding: 10 }}>Searching...</div>
          ) : items.length ? (
            items.map((row) => (
              <div
                key={row.id}
                onClick={() => {
                  onPick(row);
                  setQ(row.name);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
              >
                <span>{row.name}</span>
                {row.created_by === currentUserId && (
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      apiDeleteIngredient(row.id);
                      setItems((p) => p.filter((x) => x.id !== row.id));
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>No matches — Add new?</span>
              <button className="btn" onClick={addNew}>
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Shared Styles ---------- */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d9d9d9",
  background: "#fff",
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "var(--brand)",
  marginBottom: 4,
  display: "block",
};

/* ---------- Main ---------- */
export default function CreateRecipePage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState<number | "">("");
  const [isPublic, setIsPublic] = useState(false);
  const [steps, setSteps] = useState<Step[]>([{ position: 1, body: "" }]);
  const [lines, setLines] = useState<Line[]>([{ position: 1 }]);
  const [cover, setCover] = useState<File | null>(null);
  const [existingCoverPath, setExistingCoverPath] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  /* ---------- LOAD EXISTING RECIPE WHEN EDITING ---------- */
    useEffect(() => {
    async function loadExisting() {
        if (!editing || !id) return;

        const { data: rec } = await supabase
        .from("recipes")
        .select(
            `id, title, caption, description, servings, is_public, tags, prep_time, cook_time, difficulty, image_url`
        )
        .eq("id", id)
        .single();

        if (!rec) return;

        // Set basic fields
        setTitle(rec.title || "");
        setCaption(rec.caption || "");
        setDescription(rec.description || "");
        setServings(rec.servings ?? "");
        setIsPublic(rec.is_public ?? false);
        setTags(rec.tags || []);
        setPrepTime(rec.prep_time || "");
        setCookTime(rec.cook_time || "");
        setDifficulty(rec.difficulty || "");

        // Load existing cover
        if (rec.image_url) {
        setExistingCoverPath(rec.image_url);
        }

        // Load ingredients
        const { data: ing } = await supabase
        .from("recipe_ingredients")
        .select("position, quantity, unit_code, notes, ingredients(id, name)")
        .eq("recipe_id", id)
        .order("position");

        if (ing) {
        setLines(
            ing.map((r: any, idx: number) => ({
            position: idx + 1,
            ingredient: r.ingredients
                ? { id: r.ingredients.id, name: r.ingredients.name, created_by: r.ingredients.created_by }
                : null,
            quantity: r.quantity,
            unit_code: r.unit_code,
            notes: r.notes,
            }))
        );
        }

        // Load steps
        const { data: st } = await supabase
        .from("recipe_steps")
        .select("position, body")
        .eq("recipe_id", id)
        .order("position");

        if (st) {
        setSteps(st.map((s: any) => ({ position: s.position, body: s.body })));
        }
    }

    loadExisting();
    }, [editing, id]);


  async function saveRecipe() {
    try {
      if (!title.trim()) return showToast("Title is required.");
      if (isPublic && !cover && !existingCoverPath)
        return showToast("Public recipes must include a cover image.");

      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in first");

      // Create or update recipe
      let recipeId: number;
      if (editing && id) {
        recipeId = Number(id);
        await supabase
          .from("recipes")
          .update({
            title,
            caption,
            description,
            servings: servings === "" ? null : Number(servings),
            is_public: isPublic,
            tags,
            prep_time: prepTime || null,
            cook_time: cookTime || null,
            difficulty: difficulty || null,
          })
          .eq("id", recipeId);
        await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      } else {
        const { data: rec } = await supabase
          .from("recipes")
          .insert({
            user_id: uid,
            title,
            caption,
            description,
            servings: servings === "" ? null : Number(servings),
            is_public: isPublic,
            tags,
            prep_time: prepTime || null,
            cook_time: cookTime || null,
            difficulty: difficulty || null,
          })
          .select("id")
          .single();
        recipeId = rec!.id;
      }

      const ingRows = lines
        .filter((l) => l.ingredient?.id)
        .map((l) => ({
          recipe_id: recipeId,
          ingredient_id: l.ingredient!.id,
          quantity: l.quantity ?? null,
          unit_code: l.unit_code ?? null,
          notes: l.notes ?? null,
          position: l.position,
        }));
      if (ingRows.length)
        await supabase.from("recipe_ingredients").insert(ingRows);

      const stepRows = steps
        .filter((s) => s.body.trim())
        .map((s) => ({
          recipe_id: recipeId,
          position: s.position,
          body: s.body,
        }));
      if (stepRows.length)
        await supabase.from("recipe_steps").insert(stepRows);

      if (cover) {
        const path = `${uid}/recipes/${recipeId}/cover_${Date.now()}.jpg`;
        await supabase.storage.from("recipe-media").upload(path, cover, { upsert: true });
        await supabase.from("recipes").update({ image_url: path }).eq("id", recipeId);
      }

      showToast(editing ? "Recipe updated!" : "Recipe created!");
      setTimeout(() => nav("/me"), 1000);
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  const addStep = () =>
    setSteps((p) => [...p, { position: p.length + 1, body: "" }]);
  const removeStep = (pos: number) =>
    setSteps((p) =>
      p.filter((s) => s.position !== pos).map((s, i) => ({ ...s, position: i + 1 }))
    );

  const addLine = () => setLines((p) => [...p, { position: p.length + 1 }]);
  const removeLine = (pos: number) =>
    setLines((p) =>
      p.filter((l) => l.position !== pos).map((l, i) => ({ ...l, position: i + 1 }))
    );

  return (
    <div className="fade-in" style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
      {toast && <Toast msg={toast} />}

      <h2 style={{ textAlign: "center", color: "var(--brand)", fontSize: "1.9rem", fontWeight: 800 }}>
        {editing ? "Edit Recipe" : "Create Recipe"}
      </h2>

      <div className="card" style={{ padding: "1.6rem", borderRadius: 16, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
        {/* BASIC INFO */}
        <label style={labelStyle}>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <label style={labelStyle}>Caption</label>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} style={inputStyle} />
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
        />

        {/* META INFO */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Details</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Servings</label>
            <input
              type="number"
              placeholder="e.g., 4"
              value={servings}
              onChange={(e) =>
                setServings(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Prep Time</label>
            <input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Cook Time</label>
            <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div style={{ flex: "1 1 100px", alignSelf: "end" }}>
            <label style={{ display: "flex", gap: 8 }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public
            </label>
          </div>
        </div>

        {/* COVER IMAGE */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Cover Image</h3>
        <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        {(cover || existingCoverPath) && (
          <img
            src={
              cover
                ? URL.createObjectURL(cover)
                : supabase.storage.from("recipe-media").getPublicUrl(existingCoverPath!).data.publicUrl
            }
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: 260,
              objectFit: "cover",
              borderRadius: 12,
              marginTop: 10,
            }}
          />
        )}

        {/* TAGS */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Tags</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              className={`btn ${tags.includes(t) ? "" : "btn-secondary"}`}
              onClick={() =>
                setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* INGREDIENTS */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Ingredients</h3>
        {lines.map((l) => (
          <div
            key={l.position}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <strong>{l.position}.</strong>
            <IngredientCombo
              value={l.ingredient ?? null}
              onPick={(row) =>
                setLines((p) =>
                  p.map((x) =>
                    x.position === l.position ? { ...x, ingredient: row } : x
                  )
                )
              }
              currentUserId={userId}
            />
            <input
              type="number"
              placeholder="Qty"
              value={l.quantity ?? ""}
              onChange={(e) =>
                setLines((p) =>
                  p.map((x) =>
                    x.position === l.position
                      ? { ...x, quantity: Number(e.target.value) }
                      : x
                  )
                )
              }
              style={{ ...inputStyle, width: 80 }}
            />
            <select
              value={l.unit_code ?? ""}
              onChange={(e) =>
                setLines((p) =>
                  p.map((x) =>
                    x.position === l.position
                      ? { ...x, unit_code: e.target.value }
                      : x
                  )
                )
              }
              style={{ ...inputStyle, width: 100 }}
            >
              <option value="">unit</option>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <input
              placeholder="Notes"
              value={l.notes ?? ""}
              onChange={(e) =>
                setLines((p) =>
                  p.map((x) =>
                    x.position === l.position
                      ? { ...x, notes: e.target.value }
                      : x
                  )
                )
              }
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            />
            <button className="btn btn-danger" onClick={() => removeLine(l.position)}>
              🗑
            </button>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={addLine}>
          + Add Ingredient
        </button>

        {/* STEPS */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Steps</h3>
        {steps.map((s) => (
          <div key={s.position} style={{ marginBottom: 10 }}>
            <strong>Step {s.position}</strong>
            <textarea
              rows={2}
              value={s.body}
              onChange={(e) =>
                setSteps((p) =>
                  p.map((x) =>
                    x.position === s.position ? { ...x, body: e.target.value } : x
                  )
                )
              }
              style={{
                ...inputStyle,
                width: "100%",
                resize: "vertical",
                minHeight: 70,
              }}
            />
            <button className="btn btn-danger" onClick={() => removeStep(s.position)}>
              🗑 Delete Step
            </button>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={addStep}>
          + Add Step
        </button>

        {/* SAVE */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          {editing && (
            <button className="btn btn-danger" onClick={() => nav("/me")}>
              🗑 Delete Recipe
            </button>
          )}
          <button className="btn" disabled={loading} onClick={saveRecipe}>
            {loading ? "Saving..." : editing ? "Save Changes" : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
