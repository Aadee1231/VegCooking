import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  createIngredient,
  deleteIngredient as apiDeleteIngredient,
  searchIngredients,
  type IngredientRow
} from '../lib/ingredients';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";

type Step = { position: number; body: string; timer_seconds?: number | null };
type Line = {
  position: number;
  ingredient?: IngredientRow | null;
  quantity?: number | null;
  unit_code?: string | null;
  notes?: string | null;
};

const UNITS = ['g','kg','ml','l','tsp','tbsp','cup','pc'];

/** ========== SPREADSHEET IMPORT FUNCTION ========== **/
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

    // 🔹 Go through each row
    for (const r of rows) {
      const row = r as any;
      const ingredient = (row["Ingredient"] || "").toString().trim();
      const instruction = (row["Instructions"] || "").toString().trim();

      if (ingredient) ingredientNames.push(ingredient);
      if (instruction) steps.push(instruction);
    }

    // 1️⃣ Create the recipe
    const { data: rec, error: recErr } = await supabase
      .from("recipes")
      .insert({
        user_id: userId,
        title: recipeName,
        caption: "",
        description: "", // we’ll use steps instead
        servings: null,
        is_public: false,
      })
      .select("id")
      .single();
    if (recErr) throw recErr;
    const recipeId = rec.id;

    // 2️⃣ Add unique ingredients
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

    // 3️⃣ Add steps (one row per instruction)
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


/** ========== INGREDIENT COMBO ========== **/
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
  const [q, setQ] = useState(value?.name ?? '');
  const [items, setItems] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load results when query changes
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      if (!q.trim()) { setItems([]); return; }
      setLoading(true);
      try {
        const res = await searchIngredients(q.trim());
        setItems(res);
        setHighlight(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node) && inputRef.current !== e.target) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
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
      alert(e.message ?? 'Could not create ingredient');
    }
  }

  async function deleteIngredient(row: IngredientRow) {
    if (row.created_by !== currentUserId) {
      alert('You can only delete ingredients you created.');
      return;
    }
    if (!confirm(`Delete ingredient "${row.name}"? (Will fail if used by any recipe)`)) return;
    try {
      await apiDeleteIngredient(row.id);
      setItems(prev => prev.filter(x => x.id !== row.id));
      if (value?.id === row.id) {
        setQ('');
        onPick({ id: 0, name: '', created_by: null } as any);
      }
    } catch (e: any) {
      alert(e.message ?? 'Delete failed. It may be used by a recipe.');
    }
  }

  return (
    <div style={{ position:'relative', minWidth:260 }}>
      <input
        ref={inputRef}
        placeholder="Search or add ingredient…"
        value={q}
        onChange={(e) => { setQ(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h+1, items.length-1)); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(h-1, 0)); }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (items[highlight]) choose(items[highlight]);
            else addNew();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        style={{ paddingRight: 90 }}
      />
      <div style={{ position:'absolute', right:6, top:6, display:'flex', gap:6 }}>
        <button onClick={addNew}>Add</button>
      </div>

      {open && (
        <div
          ref={panelRef}
          style={{
            position:'absolute', zIndex:10, top:'100%', left:0, right:0,
            background:'#fff', border:'1px solid #ddd', borderRadius:8, marginTop:6,
            maxHeight:260, overflow:'auto', boxShadow:'0 6px 20px rgba(0,0,0,.08)'
          }}
        >
          <div style={{ padding:8, borderBottom:'1px solid #eee', fontSize:12, opacity:.7 }}>
            {loading ? 'Searching…' : (items.length ? 'Results' : (q ? 'No matches — press Add to create' : 'Type to search'))}
          </div>
          {items.map((row, idx) => (
            <div
              key={row.id}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => choose(row)}
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'8px 10px', cursor:'pointer',
                background: idx===highlight ? '#f5f7ff' : '#fff'
              }}
            >
              <span>{row.name}</span>
              {row.created_by === currentUserId && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteIngredient(row); }}
                  title="Delete ingredient"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** ========== MAIN PAGE ========== **/
export default function CreateRecipePage() {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number | ''>('');
  const [isPublic, setIsPublic] = useState(false);
  const [steps, setSteps] = useState<Step[]>([{ position:1, body:'' }]);
  const [lines, setLines] = useState<Line[]>([{ position:1 }]);
  const [cover, setCover] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function addStep() {
    setSteps(prev => [...prev, { position: prev.length+1, body:'' }]);
  }
  function addLine() {
    setLines(prev => [...prev, { position: prev.length+1 }]);
  }
  function removeLine(pos: number) {
    setLines(prev => prev.filter(l => l.position !== pos).map((l, idx) => ({ ...l, position: idx+1 })));
  }

  async function ensureSignedIn() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Please sign in first.');
    return data.user;
  }

  async function uploadCover(userId: string, recipeId: number) {
    if (!cover) return null;
    const path = `${userId}/recipes/${recipeId}/cover_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('recipe-media').upload(path, cover, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function onCreate() {
    setLoading(true);
    try {
      const user = await ensureSignedIn();

      const { data: rec, error: recErr } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title, caption, description,
          servings: servings === '' ? null : Number(servings),
          is_public: isPublic
        })
        .select('id')
        .single();
      if (recErr) throw recErr;
      const recipeId = rec.id as number;

      const stepsPayload = steps
        .filter(s => s.body.trim().length > 0)
        .map(s => ({ recipe_id: recipeId, position: s.position, body: s.body, timer_seconds: s.timer_seconds ?? null }));
      if (stepsPayload.length) {
        const { error } = await supabase.from('recipe_steps').insert(stepsPayload);
        if (error) throw error;
      }

      const ingPayload = lines
        .filter(l => l.ingredient && l.ingredient.id)
        .map(l => ({
          recipe_id: recipeId,
          ingredient_id: l.ingredient!.id,
          quantity: l.quantity ?? null,
          unit_code: l.unit_code ?? null,
          notes: l.notes ?? null,
          position: l.position
        }));
      if (ingPayload.length) {
        const { error } = await supabase.from('recipe_ingredients').insert(ingPayload);
        if (error) throw error;
      }

      const path = await uploadCover(user.id, recipeId);
      if (path) {
        await supabase.from('recipes').update({ image_url: path }).eq('id', recipeId);
      }

      alert('Recipe created!');
      navigate('/');
    } catch (e: any) {
      alert(e.message ?? 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <h2>Create Recipe</h2>

      <div style={{ display:'grid', gap:8 }}>
        <input placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)} />
        <input placeholder="Caption" value={caption} onChange={e=>setCaption(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="number" placeholder="Servings" value={servings} onChange={e=>setServings(e.target.value === '' ? '' : Number(e.target.value))}/>
          <label><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} /> Public</label>
        </div>
        <div>
          <label>Cover image (optional): </label>
          <input type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0] ?? null)} />
        </div>

        {/* === SPREADSHEET UPLOAD === */}
        <div>
          <label>Import recipes from spreadsheet: </label>
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
          />
        </div>
      </div>

      <section>
        <h3>Steps</h3>
        {steps.map((s) => (
          <div key={s.position} style={{ display:'grid', gap:4, marginBottom:8 }}>
            <strong>Step {s.position}</strong>
            <textarea
              placeholder="Do this..."
              value={s.body}
              onChange={e=>{
                const body = e.target.value;
                setSteps(prev => prev.map(x => x.position===s.position ? { ...x, body } : x));
              }}
            />
          </div>
        ))}
        <button onClick={addStep}>+ Add step</button>
      </section>

      <section>
        <h3>Ingredients</h3>
        {lines.map((l) => (
          <div key={l.position} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
            <span>#{l.position}</span>

            <IngredientCombo
              value={l.ingredient ?? null}
              onPick={(row) => setLines(prev => {
                const next = [...prev];
                next[l.position-1] = { ...l, ingredient: row };
                return next;
              })}
              currentUserId={userId}
            />

            <input
              type="number"
              placeholder="qty"
              value={l.quantity ?? ''}
              onChange={e=>setLines(prev=>{
                const next=[...prev]; next[l.position-1]={...l, quantity: e.target.value===''? null : Number(e.target.value)}; return next;
              })}
            />

            <select
              value={l.unit_code ?? ''}
              onChange={e=>setLines(prev=>{
                const next=[...prev]; next[l.position-1]={...l, unit_code: e.target.value || null}; return next;
              })}
            >
              <option value="">unit</option>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <input
              placeholder="notes"
              value={l.notes ?? ''}
              onChange={e=>setLines(prev=>{
                const next=[...prev]; next[l.position-1]={...l, notes: e.target.value || null}; return next;
              })}
            />

            <button onClick={() => removeLine(l.position)}>Remove line</button>
          </div>
        ))}
        <button onClick={addLine}>+ Add ingredient line</button>
      </section>

      <button disabled={loading || title.trim()===''} onClick={onCreate}>
        {loading ? 'Saving...' : 'Create Recipe'}
      </button>
    </div>
  );
}
