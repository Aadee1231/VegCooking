import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  createIngredient,
  deleteIngredient as apiDeleteIngredient,
  searchIngredients,
  type IngredientRow,
} from "../lib/ingredients";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

type Step = { position: number; body: string; timer_seconds?: number | null };
type Line = {
  position: number;
  ingredient?: IngredientRow | null;
  quantity?: number | null;
  unit_code?: string | null;
  notes?: string | null;
};
const UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "pc"];

/** ---------- SPREADSHEET IMPORT ---------- **/
async function importSpreadsheet(file: File, userId: string) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const importedRecipes: any[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    if (rows.length === 0) continue;

    const recipeName = (rows[0] as any)["Recipe Name"] || sheetName;
    const ingredientNames: string[] = [];
    const steps: string[] = [];

    for (const r of rows) {
      const row = r as any;
      const ingredient = (row["Ingredient"] || "").toString().trim();
      const instruction = (row["Instructions"] || "").toString().trim();
      if (ingredient) ingredientNames.push(ingredient);
      if (instruction) steps.push(instruction);
    }

    const { data: rec, error: recErr } = await supabase
      .from("recipes")
      .insert({
        user_id: userId,
        title: recipeName,
        caption: "",
        description: "",
        servings: null,
        is_public: false,
      })
      .select("id")
      .single();
    if (recErr) throw recErr;
    const recipeId = rec.id;

    let pos = 1;
    for (const ingredientName of [...new Set(ingredientNames)]) {
      if (!ingredientName) continue;
      const { data: ing, error: ingErr } = await supabase.rpc(
        "create_or_get_ingredient",
        { p_name: ingredientName }
      );
      if (ingErr) throw ingErr;
      await supabase.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_id: ing.id,
        position: pos++,
      });
    }

    pos = 1;
    for (const s of steps) {
      await supabase.from("recipe_steps").insert({
        recipe_id: recipeId,
        position: pos++,
        body: s,
      });
    }
    importedRecipes.push(recipeName);
  }

  return importedRecipes;
}

/** ---------- INGREDIENT COMBO ---------- **/
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

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      if (!q.trim()) return setItems([]);
      setLoading(true);
      try {
        const res = await searchIngredients(q.trim());
        setItems(res);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && inputRef.current !== e.target) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function choose(row: IngredientRow) {
    onPick(row);
    setQ(row.name);
    setOpen(false);
  }

  async function addNew() {
    const name = q.trim();
    if (!name) return;
    try {
      const row = await createIngredient(name);
      choose(row);
    } catch (e: any) {
      alert(e.message ?? "Could not create ingredient");
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
            marginTop: 4,
            maxHeight: 220,
            overflow: "auto",
            borderRadius: 10,
          }}
        >
          {loading ? (
            <div style={{ padding: 10 }}>Searching...</div>
          ) : items.length ? (
            items.map((row) => (
              <div
                key={row.id}
                onClick={() => choose(row)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span>{row.name}</span>
                {row.created_by === currentUserId && (
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      apiDeleteIngredient(row.id);
                      setItems((prev) => prev.filter((x) => x.id !== row.id));
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>No matches — press Add</span>
              <button className="btn" onClick={addNew}>Add</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** ---------- MAIN PAGE ---------- **/
export default function CreateRecipePage() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState<number | "">("");
  const [isPublic, setIsPublic] = useState(false);
  const [steps, setSteps] = useState<Step[]>([{ position: 1, body: "" }]);
  const [lines, setLines] = useState<Line[]>([{ position: 1 }]);
  const [cover, setCover] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function addStep() { setSteps((p) => [...p, { position: p.length + 1, body: "" }]); }
  function addLine() { setLines((p) => [...p, { position: p.length + 1 }]); }
  function removeLine(pos: number) {
    setLines((p) => p.filter((l) => l.position !== pos).map((l, i) => ({ ...l, position: i + 1 })));
  }

  async function ensureSignedIn() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Please sign in first.");
    return data.user;
  }

  async function uploadCover(userId: string, recipeId: number) {
    if (!cover) return null;
    const path = `${userId}/recipes/${recipeId}/cover_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("recipe-media").upload(path, cover, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function onCreate() {
    setLoading(true);
    try {
      const user = await ensureSignedIn();
      const { data: rec, error } = await supabase
        .from("recipes")
        .insert({
          user_id: user.id,
          title,
          caption,
          description,
          servings: servings === "" ? null : Number(servings),
          is_public: isPublic,
        })
        .select("id")
        .single();
      if (error) throw error;
      const recipeId = rec.id;

      const stepsPayload = steps.filter((s) => s.body.trim()).map((s) => ({ recipe_id: recipeId, position: s.position, body: s.body }));
      if (stepsPayload.length) await supabase.from("recipe_steps").insert(stepsPayload);

      const ingPayload = lines
        .filter((l) => l.ingredient && l.ingredient.id)
        .map((l) => ({
          recipe_id: recipeId,
          ingredient_id: l.ingredient!.id,
          quantity: l.quantity ?? null,
          unit_code: l.unit_code ?? null,
          notes: l.notes ?? null,
          position: l.position,
        }));
      if (ingPayload.length) await supabase.from("recipe_ingredients").insert(ingPayload);

      const path = await uploadCover(user.id, recipeId);
      if (path) await supabase.from("recipes").update({ image_url: path }).eq("id", recipeId);

      alert("Recipe created!");
      navigate("/");
    } catch (e: any) {
      alert(e.message ?? "Failed to create recipe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card fade-in" style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.6rem", color: "#2e7d32", marginBottom: "1rem" }}>Create Recipe</h2>

      <div className="create-grid">
        <input placeholder="Recipe Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Short Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <textarea placeholder="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} style={{ gridColumn: "1 / -1" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="number"
            placeholder="Servings"
            value={servings}
            onChange={(e) => setServings(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ width: 160 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public
          </label>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            Upload Cover
            <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          </label>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            Import .xlsx
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return alert("Please sign in first.");
                const imported = await importSpreadsheet(file, user.id);
                alert(`${imported.length} recipes imported!`);
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      <h3 style={{ color: "#2e7d32", marginTop: "1.2rem" }}>Ingredients</h3>
      {lines.map((l) => (
        <div key={l.position} className="line-row" style={{ marginBottom: 8 }}>
          <span style={{ textAlign: "center", color: "#666" }}>#{l.position}</span>
          <IngredientCombo
            value={l.ingredient ?? null}
            onPick={(row) =>
              setLines((prev) => {
                const next = [...prev];
                next[l.position - 1] = { ...l, ingredient: row };
                return next;
              })
            }
            currentUserId={userId}
          />
          <input
            type="number"
            placeholder="Qty"
            value={l.quantity ?? ""}
            onChange={(e) =>
              setLines((prev) => {
                const next = [...prev];
                next[l.position - 1] = { ...l, quantity: e.target.value === "" ? null : Number(e.target.value) };
                return next;
              })
            }
          />
          <select
            value={l.unit_code ?? ""}
            onChange={(e) =>
              setLines((prev) => {
                const next = [...prev];
                next[l.position - 1] = { ...l, unit_code: e.target.value || null };
                return next;
              })
            }
          >
            <option value="">unit</option>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
          <input
            placeholder="Notes"
            value={l.notes ?? ""}
            onChange={(e) =>
              setLines((prev) => {
                const next = [...prev];
                next[l.position - 1] = { ...l, notes: e.target.value || null };
                return next;
              })
            }
          />
          <button className="btn btn-danger" onClick={() => removeLine(l.position)}>✖</button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={addLine}>+ Add Ingredient</button>

      <h3 style={{ color: "#2e7d32", marginTop: "1.2rem" }}>Steps</h3>
      {steps.map((s) => (
        <div key={s.position} className="step-block" style={{ marginBottom: 8 }}>
          <strong>Step {s.position}</strong>
          <textarea
            placeholder="Describe this step..."
            value={s.body}
            onChange={(e) => {
              const body = e.target.value;
              setSteps((prev) => prev.map((x) => (x.position === s.position ? { ...x, body } : x)));
            }}
            style={{ marginTop: 6, width: "100%" }}
            rows={3}
          />
        </div>
      ))}
      <button className="btn btn-secondary" onClick={addStep}>+ Add Step</button>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn" style={{ marginTop: "1.2rem" }} disabled={loading || !title.trim()} onClick={onCreate}>
          {loading ? "Saving..." : "Create Recipe"}
        </button>
      </div>
    </div>
  );
}
