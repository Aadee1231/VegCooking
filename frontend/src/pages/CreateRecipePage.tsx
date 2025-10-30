import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  createIngredient,
  deleteIngredient as apiDeleteIngredient,
  searchIngredients,
  type IngredientRow,
} from "../lib/ingredients";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";

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
  "Comfort Food",
  "Healthy",
  "Dessert",
  "Spicy",
  "Quick",
  "Breakfast",
  "Dinner",
];

/* ---------- Spreadsheet Import ---------- */
async function importSpreadsheet(file: File, userId: string) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const imported: string[] = [];

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet);
    if (!rows.length) continue;

    const recipeName = (rows[0] as any)["Recipe Name"] || name;
    const ingredients: string[] = [];
    const steps: string[] = [];

    for (const r of rows) {
      const ing = (r as any)["Ingredient"];
      const step = (r as any)["Instructions"];
      if (ing) ingredients.push(String(ing));
      if (step) steps.push(String(step));
    }

    const { data: rec } = await supabase
      .from("recipes")
      .insert({
        user_id: userId,
        title: recipeName,
        caption: "",
        description: "",
        is_public: false,
      })
      .select("id")
      .single();
    const recipeId = rec!.id;

    let pos = 1;
    for (const n of [...new Set(ingredients)]) {
      const { data: ing } = await supabase.rpc("create_or_get_ingredient", { p_name: n });
      await supabase.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_id: ing.id,
        position: pos++,
      });
    }
    pos = 1;
    for (const s of steps)
      await supabase.from("recipe_steps").insert({ recipe_id: recipeId, position: pos++, body: s });

    imported.push(recipeName);
  }
  return imported;
}

/* ---------- Ingredient Combo ---------- */
// inside CreateRecipePage.tsx — replace the IngredientCombo component with this updated version
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

  // ✅ keep input in sync when parent value changes (fixes “first ingredient disappears”)
  useEffect(() => {
    setQ(value?.name ?? "");
  }, [value?.id, value?.name]);

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
    <div style={{ position: "relative", minWidth: 220 }}>
      <input
        ref={inputRef}
        placeholder="Search or add ingredient…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div
          ref={panelRef}
          className="card"
          style={{
            position: "absolute",
            zIndex: 10,
            top: "105%",
            left: 0,
            right: 0,
            maxHeight: 220,
            overflow: "auto",
            marginTop: 4,
            borderRadius: 10,
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
            <div style={{ padding: 10, display: "flex", justifyContent: "space-between" }}>
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


/* ---------- Main Page ---------- */
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
  const [tags, setTags] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (editing && id) loadRecipe(Number(id));
  }, [id]);

  async function loadRecipe(recipeId: number) {
    setLoading(true);
    const { data: rec } = await supabase.from("recipes").select("*").eq("id", recipeId).single();
    if (!rec) return alert("Recipe not found.");
    setTitle(rec.title);
    setCaption(rec.caption || "");
    setDescription(rec.description || "");
    setServings(rec.servings || "");
    setIsPublic(rec.is_public);
    setTags(rec.tags || []);

    const { data: ing } = await supabase
      .from("recipe_ingredients")
      .select("quantity,unit_code,notes,ingredients(id,name)")
      .eq("recipe_id", recipeId)
      .order("position");
    setLines(
      (ing ?? []).map((r: any, i: number) => ({
        position: i + 1,
        ingredient: {
          id: r.ingredients.id,
          name: r.ingredients.name,
          created_by: r.ingredients.created_by ?? null,
        },
        quantity: r.quantity,
        unit_code: r.unit_code,
        notes: r.notes,
      }))
    );

    const { data: st } = await supabase
      .from("recipe_steps")
      .select("position,body")
      .eq("recipe_id", recipeId)
      .order("position");
    setSteps(st ?? [{ position: 1, body: "" }]);
    setLoading(false);
  }

  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  async function uploadCover(uid: string, rid: number) {
    if (!cover) return null;
    const path = `${uid}/recipes/${rid}/cover_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("recipe-media").upload(path, cover, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function saveRecipe() {
    try {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in first");

      let recipeId: number;
      if (editing && id) {
        recipeId = Number(id);
        const { error } = await supabase
          .from("recipes")
          .update({
            title,
            caption,
            description,
            servings: servings === "" ? null : Number(servings),
            is_public: isPublic,
            tags,
          })
          .eq("id", recipeId);
        if (error) throw error;
        await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      } else {
        const { data: rec, error } = await supabase
          .from("recipes")
          .insert({
            user_id: uid,
            title,
            caption,
            description,
            servings: servings === "" ? null : Number(servings),
            is_public: isPublic,
            tags,
          })
          .select("id")
          .single();
        if (error) throw error;
        recipeId = rec.id;
      }

      const stepRows = steps.filter((s) => s.body.trim()).map((s) => ({
        recipe_id: recipeId,
        position: s.position,
        body: s.body,
      }));
      if (stepRows.length) await supabase.from("recipe_steps").insert(stepRows);

      const ingRows = lines.filter((l) => l.ingredient?.id).map((l) => ({
        recipe_id: recipeId,
        ingredient_id: l.ingredient!.id,
        quantity: l.quantity ?? null,
        unit_code: l.unit_code ?? null,
        notes: l.notes ?? null,
        position: l.position,
      }));
      if (ingRows.length) await supabase.from("recipe_ingredients").insert(ingRows);

      const coverPath = await uploadCover(uid, recipeId);
      if (coverPath) await supabase.from("recipes").update({ image_url: coverPath }).eq("id", recipeId);

      alert(editing ? "Recipe updated!" : "Recipe created!");
      nav("/me");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecipe() {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    await supabase.from("recipes").delete().eq("id", id);
    alert("Recipe deleted.");
    nav("/me");
  }

  const addStep = () => setSteps((p) => [...p, { position: p.length + 1, body: "" }]);
  const removeStep = (pos: number) =>
    setSteps((p) => p.filter((s) => s.position !== pos).map((s, i) => ({ ...s, position: i + 1 })));

  const addLine = () => setLines((p) => [...p, { position: p.length + 1 }]);
  const removeLine = (pos: number) =>
    setLines((p) => p.filter((l) => l.position !== pos).map((l, i) => ({ ...l, position: i + 1 })));

  return (
    <div className="fade-in" style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ color: "var(--brand)", marginBottom: 20 }}>
        {editing ? "Edit Recipe" : "Create Recipe"}
      </h2>

      <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Basic info */}
        <input placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <textarea
          placeholder="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="number"
            placeholder="Servings"
            value={servings}
            onChange={(e) => setServings(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <label>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public
          </label>
        </div>

        {/* Upload */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="btn btn-secondary">
            Upload Cover
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              style={{ display: "none" }}
            />
          </label>
          <label className="btn btn-secondary">
            Import .xlsx
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const { data } = await supabase.auth.getUser();
                const uid = data.user?.id;
                if (!uid) return alert("Sign in first");
                const done = await importSpreadsheet(f, uid);
                alert(`${done.length} recipes imported`);
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Tags */}
        <h3 style={{ color: "var(--brand)", marginTop: 16 }}>Tags</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={tags.includes(t) ? "btn" : "btn btn-secondary"}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Ingredients */}
        <h3 style={{ color: "var(--brand)", marginTop: 16 }}>Ingredients</h3>
        {lines.map((l) => (
          <div
            key={l.position}
            style={{
              marginBottom: 8,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span>#{l.position}</span>
            <IngredientCombo
              value={l.ingredient ?? null}
              onPick={(row) => {
                setLines((p) => {
                  const n = [...p];
                  n[l.position - 1] = { ...l, ingredient: row };
                  return n;
                });
              }}
              currentUserId={userId}
            />
            <input
              type="number"
              placeholder="Qty"
              value={l.quantity ?? ""}
              onChange={(e) =>
                setLines((p) => {
                  const n = [...p];
                  n[l.position - 1] = {
                    ...l,
                    quantity: e.target.value === "" ? null : Number(e.target.value),
                  };
                  return n;
                })
              }
            />
            <select
              value={l.unit_code ?? ""}
              onChange={(e) =>
                setLines((p) => {
                  const n = [...p];
                  n[l.position - 1] = { ...l, unit_code: e.target.value || null };
                  return n;
                })
              }
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
                setLines((p) => {
                  const n = [...p];
                  n[l.position - 1] = { ...l, notes: e.target.value || null };
                  return n;
                })
              }
            />
            <button className="btn btn-danger" onClick={() => removeLine(l.position)}>
              ✖
            </button>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={addLine}>
          + Add Ingredient
        </button>

        {/* Steps */}
        <h3 style={{ color: "var(--brand)", marginTop: 16 }}>Steps</h3>
        {steps.map((s) => (
          <div key={s.position} style={{ marginBottom: 10 }}>
            <strong>Step {s.position}</strong>
            <textarea
              rows={3}
              value={s.body}
              placeholder="Describe..."
              onChange={(e) =>
                setSteps((p) =>
                  p.map((x) => (x.position === s.position ? { ...x, body: e.target.value } : x))
                )
              }
            />
            <button
              className="btn btn-danger"
              style={{ marginTop: 4 }}
              onClick={() => removeStep(s.position)}
            >
              🗑 Delete Step
            </button>
          </div>
        ))}
        <button className="btn btn-secondary" onClick={addStep}>
          + Add Step
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          {editing && (
            <button className="btn btn-danger" onClick={deleteRecipe}>
              🗑 Delete Recipe
            </button>
          )}
          <button className="btn" disabled={loading || !title.trim()} onClick={saveRecipe}>
            {loading ? "Saving..." : editing ? "Save Changes" : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
