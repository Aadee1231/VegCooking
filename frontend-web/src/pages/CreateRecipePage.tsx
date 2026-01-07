import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  createIngredient,
  deleteIngredient as apiDeleteIngredient,
  searchIngredients,
  type IngredientRow,
} from "../lib/ingredients";
import { useNavigate, useParams } from "react-router-dom";
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
  Check,
  Plus,
} from "phosphor-react";




/* ---------- Types ---------- */
type Step = { position: number; body: string };
type Line = {
  position: number;
  ingredient?: IngredientRow | null;
  quantity?: string | null;
  unit_code?: string | null;
  notes?: string | null;
};
type AIIngredient = {
  name: string;
  ingredient_id?: number | null;
  quantity?: number | null;
  unit?: string | null;
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

/* ---------- Utility Functions ---------- */
function parseQuantityToNumber(qtyRaw: string): number | null {
  const qty = qtyRaw.trim();
  if (!qty) return null;

  // Decimal: "0.5", "2", "2.25"
  if (/^\d+(\.\d+)?$/.test(qty)) {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // Fraction: "1/2"
  if (/^\d+\/\d+$/.test(qty)) {
    const [a, b] = qty.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    const n = a / b;
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // Mixed fraction: "1 1/2"
  if (/^\d+\s+\d+\/\d+$/.test(qty)) {
    const [wholeStr, fracStr] = qty.split(" ");
    const whole = Number(wholeStr);
    const [a, b] = fracStr.split("/").map(Number);
    if (!Number.isFinite(whole) || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    const n = whole + a / b;
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // Anything else = invalid
  return null;
}

function sanitizeQuantityInput(raw: string) {
  let s = raw.replace(/[^\d\/.\s]/g, "");
  s = s.replace(/-/g, "");
  s = s.replace(/\s+/g, " ");
  s = s.replace(/^\s+/, "");

  const firstSlash = s.indexOf("/");
  if (firstSlash !== -1) {
    s =
      s.slice(0, firstSlash + 1) +
      s.slice(firstSlash + 1).replace(/\//g, "");
  }

  const hasSlash = s.includes("/");
  if (hasSlash) {
    s = s.replace(/\./g, "");
  } else {
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      s =
        s.slice(0, firstDot + 1) +
        s.slice(firstDot + 1).replace(/\./g, "");
    }
  }

  const firstSpace = s.indexOf(" ");
  if (firstSpace !== -1) {
    s =
      s.slice(0, firstSpace + 1) +
      s.slice(firstSpace + 1).replace(/ /g, "");
  }

  return s;
}

function isValidQuantityWhileTyping(qty: string) {
  if (qty === "") return true;

  if (/^\d+(\.)?$/.test(qty)) return true;
  if (/^\d+(\.\d+)?$/.test(qty)) return true;

  if (/^\d+\/?$/.test(qty)) return true;
  if (/^\d+\/\d+$/.test(qty)) return true;

  if (/^\d+\s?$/.test(qty)) return true;
  if (/^\d+\s+\d+\/?$/.test(qty)) return true;
  if (/^\d+\s+\d+\/\d+$/.test(qty)) return true;

  return false;
}

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
  const [confirmName, setConfirmName] = useState<string | null>(null);

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

    function addNew() {
        const name = q.trim();
        if (!name) return;

        setConfirmName(name);
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
                    <Trash size={18} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: 10 }}>
            {!confirmName ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>No matches — Add new?</span>
                <button
                    type="button"
                    className="btn"
                    onClick={addNew}
                >
                    Add
                </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <strong>
                    Add “{confirmName}” as a new ingredient?
                </strong>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                        try {
                        const created = await createIngredient(confirmName);
                        onPick(created);
                        setOpen(false);
                        setConfirmName(null);
                        window.vcToast("Ingredient added!");
                        } catch (e: any) {
                        window.vcToast(e.message || "Ingredient already exists.");
                        setConfirmName(null);
                        }
                    }}
                    >
                    <Check size={18} /> Yes, Add
                    </button>

                    <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmName(null)}
                    >
                    <X size={18} /> Cancel
                    </button>
                </div>
                </div>
            )}
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

  // IMPORTANT — make this writable:
  const [existingCoverPath, setExistingCoverPath] = useState<string | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [demoUrl, setDemoUrl] = useState("");

  //AI Import
  const [importVideo, setImportVideo] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");

  /* -------------------------------------------------------------
  AI Import Video
  ------------------------------------------------------------- */
  async function importFromLink() {
  const url = importUrl.trim();
  if (!url) return window.vcToast("Paste a video link first.");

  setImporting(true);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  try {
    const base = import.meta.env.VITE_API_BASE_URL;

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${base}/video-import-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Link import failed");
    }

    const { job_id } = await res.json();
    
    // Poll for job completion
    let jobStatus;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    do {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
      
      const statusRes = await fetch(`${base}/import/jobs/${job_id}`, {
        headers,
      });
      
      if (statusRes.ok) {
        jobStatus = await statusRes.json();
      }
    } while (jobStatus?.status === 'processing' && attempts < maxAttempts);
    
    if (jobStatus?.status === 'completed' && jobStatus.result_json) {
      const draft = jobStatus.result_json;

      // same population logic you already do
      setTitle(draft.title ?? "");
      setCaption(draft.caption ?? "");
      setDescription(draft.description ?? "");
      setServings(draft.servings ?? "");
      setTags(draft.tags ?? []);

      setLines(
        (draft.ingredients ?? []).map((ing: any, i: number) => ({
          position: i + 1,
          ingredient: ing.ingredient_id
            ? { id: ing.ingredient_id, name: ing.name, created_by: null }
            : null,
          quantity: ing.quantity != null ? String(ing.quantity) : null,
          unit_code: ing.unit ?? null,
          notes: ing.notes ?? null,
        }))
      );

      setSteps(
        (draft.steps ?? []).map((s: any, i: number) => ({
          position: i + 1,
          body: s.body ?? "",
        }))
      );

      window.vcToast("Imported from link! Review before saving.");
    } else if (jobStatus?.status === 'failed') {
      throw new Error(jobStatus.error_message || "Processing failed");
    } else {
      throw new Error("Import timed out. Please try again.");
    }
  } catch (err: any) {
    if (err.name === "AbortError") window.vcToast("Import timed out. Try again.");
    else window.vcToast(err.message || "Import failed");
  } finally {
    clearTimeout(timeoutId);
    setImporting(false);
  }
}

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function importFromVideo() {
    if (!importVideo) {
      window.vcToast("Upload a video first.");
      return;
    }

    setImporting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 180_000); // 3 minutes

    try {
      const fd = new FormData();
      fd.append("video", importVideo);

      const base = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${base}/video-import`, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Video import failed");
      }

      const draft = await res.json();

      // ⬇️ Populate state
      setTitle(draft.title ?? "");
      setCaption(draft.caption ?? "");
      setDescription(draft.description ?? "");
      setServings(draft.servings ?? "");
      setPrepTime(draft.prep_time ?? "");
      setCookTime(draft.cook_time ?? "");
      setDifficulty(draft.difficulty ?? "");
      setTags(draft.tags ?? []);

      setSteps(
        draft.steps.map((s: any, i: number) => ({
          position: i + 1,
          body: s.body ?? "",
        }))
      );

      setLines(
        draft.ingredients.map((ing: any, i: number) => ({
          position: i + 1,
          ingredient: ing.ingredient_id
            ? { id: ing.ingredient_id, name: ing.name, created_by: null }
            : null,
          quantity: ing.quantity != null ? String(ing.quantity) : null,
          unit_code: ing.unit ?? null,
          notes: ing.notes ?? null,
        }))
      );

      window.vcToast("Imported! Review before saving.");
    } catch (err: any) {
      if (err.name === "AbortError") {
        window.vcToast("Import timed out. Try again.");
      } else {
        window.vcToast(err.message || "Import failed");
      }
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  }





  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  /* -------------------------------------------------------------
     🟢 EDIT MODE — LOAD EXISTING RECIPE DATA
     ------------------------------------------------------------- */
  useEffect(() => {
    if (!editing || !id) return;

    async function loadExisting() {
      const { data: rec } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id) 
        .single();

      if (!rec) return;

      setTitle(rec.title ?? "");
      setCaption(rec.caption ?? "");
      setDescription(rec.description ?? "");
      setServings(rec.servings ?? "");
      setIsPublic(rec.is_public ?? false);
      setTags(rec.tags ?? []);
      setPrepTime(rec.prep_time ?? "");
      setCookTime(rec.cook_time ?? "");
      setDifficulty(rec.difficulty ?? "");
      setDemoUrl(rec.demo_url ?? "");

      if (rec.image_url) setExistingCoverPath(rec.image_url);

      // Load Ingredients
      const { data: ing } = await supabase
        .from("recipe_ingredients")
        .select("position,quantity,unit_code,notes,ingredients(id,name)")
        .eq("recipe_id", id)
        .order("position");

      if (ing?.length) {
        setLines(
          ing.map((r: any) => ({
            position: r.position,
            ingredient: r.ingredients,
            quantity: r.quantity != null ? String(r.quantity) : null, // ✅ FIX
            unit_code: r.unit_code,
            notes: r.notes,
          }))
        );
      }

      // Load Steps
      const { data: st } = await supabase
        .from("recipe_steps")
        .select("position,body")
        .eq("recipe_id", id)
        .order("position");

      if (st?.length) {
        setSteps(st);
      }
    }

    loadExisting();
  }, [editing, id]);

  /* -------------------------------------------------------------
     SAVE RECIPE
     ------------------------------------------------------------- */
  async function saveRecipe() {
    try {
      if (!title.trim()) return window.vcToast("Title is required.");
      if (isPublic && !cover && !existingCoverPath)
        return window.vcToast("Public recipes must include a cover image.");
      if (servings !== "" && (Number(servings) <= 0 || !Number.isFinite(Number(servings))))
        return window.vcToast("Servings must be a positive number.");

      const timePattern = /^\d+\s*(min|mins|minutes|hr|hrs|hour|hours)?$/i;

      if (prepTime && !timePattern.test(prepTime.trim())) {
        return window.vcToast(
            "Prep time should start with a number, e.g. '20 min' or '1 hr'."
        );
        }
      if (cookTime && !timePattern.test(cookTime.trim())) {
        return window.vcToast(
            "Cook time should start with a number, e.g. '30 min' or '45 minutes'."
        );
        }
 

      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in first");

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
            demo_url: demoUrl || null,
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
            demo_url: demoUrl || null,
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
          quantity: l.quantity ? parseQuantityToNumber(l.quantity) : null,
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

      window.vcToast(editing ? "Recipe updated!" : "Recipe created!");
      setTimeout(() => nav("/me"), 1000);
    } catch (e: any) {
      window.vcToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------------
     ADD / REMOVE ITEMS
     ------------------------------------------------------------- */
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

    


  /* -------------------------------------------------------------
     UI RENDER
     ------------------------------------------------------------- */
  return (
      <form
        onSubmit={(e) => {
            e.preventDefault();   // stops page refresh
            void saveRecipe();    // calls your existing saveRecipe function
        }}
        className="fade-in"
        style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}
      >

      <h2 style={{ textAlign: "center", color: "var(--brand)", fontSize: "1.9rem", fontWeight: 800 }}>
        {editing ? "Edit Recipe" : "Create Recipe"}
      </h2>


      <div className="card" style={{ padding: "1.8rem", borderRadius: 18, display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
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
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Import from Video</h3>

        <input
        type="file"
        accept="video/*"
        onChange={(e) => setImportVideo(e.target.files?.[0] ?? null)}
        />

        <button
        type="button"
        className="btn"
        onClick={importFromVideo}
        disabled={importing}
        style={{ marginTop: 10 }}
        >
        {importing ? "Importing..." : "Import from Video"}
        </button>

        <small style={{ color: "#777" }}>
        Upload a cooking video and we’ll auto-fill the recipe. You can edit everything before saving.
        </small>

        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Details</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Servings</label>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="e.g., 4"
              value={servings}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                setServings("");
                } else {
                const num = Number(val);
                if (Number.isFinite(num) && num > 0) {
                    setServings(num);
                }
                }
              }}              
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

        {/* Demo Reel */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Demo Video (optional)</h3>
        <input
        type="url"
        placeholder="YouTube / Instagram / TikTok link..."
        value={demoUrl}
        onChange={(e) => setDemoUrl(e.target.value)}
        style={inputStyle}
        />
        <small style={{ color: "#777", marginTop: 4 }}>
        This link will show on the recipe page as a demo video.
        </small>


        {/* TAGS */}
        <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Tags</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAG_OPTIONS.map((t) => (
            <button
              type = "button"
              key={t}
              className={`btn ${tags.includes(t) ? "" : "btn-secondary"}`}
              onClick={() => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
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
                  p.map((x) => (x.position === l.position ? { ...x, ingredient: row } : x))
                )
              }
              currentUserId={userId}
            />

            <input
            type="text"
            placeholder="ex: 1/2 or 0.5"
            value={l.quantity ?? ""}
            onChange={(e) => {
                const cleaned = sanitizeQuantityInput(e.target.value);
                if (!isValidQuantityWhileTyping(cleaned)) return;

                setLines((p) =>
                p.map((x) =>
                    x.position === l.position
                    ? { ...x, quantity: cleaned }
                    : x
                )
                );
            }}
            style={{ ...inputStyle, width: 110 }}
            />



            <select
              value={l.unit_code ?? ""}
              onChange={(e) =>
                setLines((p) =>
                  p.map((x) =>
                    x.position === l.position ? { ...x, unit_code: e.target.value } : x
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
                    x.position === l.position ? { ...x, notes: e.target.value } : x
                  )
                )
              }
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            />

            <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeLine(l.position)}
                >
                <Trash size={18} />
            </button>

          </div>
        ))}

        <button
            type="button"
            className="btn btn-secondary"
            onClick={addLine}
            >
            <Plus size={18} /> Add Ingredient
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
                  p.map((x) => (x.position === s.position ? { ...x, body: e.target.value } : x))
                )
              }
              style={{
                ...inputStyle,
                width: "100%",
                resize: "vertical",
                minHeight: 70,
              }}
            />

            <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeStep(s.position)}
                >
                <Trash size={18} /> Delete Step
            </button>

          </div>
        ))}

            <button
                type="button"
                className="btn btn-secondary"
                onClick={addStep}
                >
                + Add Step
            </button>


        {/* SAVE */}
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 20,
            }}
            >
            {editing && (
                <button
                type="button"
                className="btn btn-danger"
                onClick={() => nav("/me")}
                >
                <Trash size={18} /> Delete Recipe
                </button>
            )}

            <button
                className="btn"
                type="submit"
                disabled={loading}
            >
                {loading ? "Saving..." : editing ? "Save Changes" : "Create Recipe"}
            </button>
          </div>
      </div>
    </form>
  );
}
