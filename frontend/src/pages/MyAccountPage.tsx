import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import ProfileEditor from '../components/ProfileEditor'; 

type Recipe = { id:number; title:string; is_public:boolean; created_at:string };
type Ingredient = { id:number; name:string };
type AddedRecipe = { id:number; recipe:{id:number; title:string; created_at:string; user_id:string} };


export default function MyAccountPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [added, setAdded] = useState<AddedRecipe[]>([]);


  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id ?? null;
      setUid(userId);
      if (!userId) return;

      const { data: r } = await supabase
        .from('recipes')
        .select('id,title,is_public,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending:false });
      setRecipes((r ?? []) as any);

      // added recipes
    const { data: a } = await supabase
      .from("user_added_recipes")
      .select("id, recipe:recipes(id,title,created_at,user_id)")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });
    setAdded((a ?? []) as any);

    // ingredients (same as before)
    const { data: g } = await supabase
      .from("ingredients")
      .select("id,name")
      .eq("created_by", userId)
      .order("name");
    setIngs((g ?? []) as any);
    })();
  }, []);

  async function togglePublic(id:number, isPublic:boolean) {
    const { error, data } = await supabase
      .from('recipes')
      .update({ is_public: !isPublic })
      .eq('id', id)
      .select('id,is_public')
      .single();
    if (!error) setRecipes(prev => prev.map(r => r.id===id ? { ...r, is_public: data!.is_public as any } : r));
  }

  async function deleteRecipe(id: number) {
  if (!confirm("Delete this recipe? (This will also delete its steps, ingredients, and comments)")) return;
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) { alert(error.message); return; }
  setRecipes(prev => prev.filter(r => r.id !== id));
}

async function deleteIngredient(id: number, name: string) {
  if (!confirm(`Delete ingredient "${name}"? (Will fail if used by any recipe)`)) return;
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) { 
    alert(error.message + " — it might still be used in a recipe."); 
    return; 
  }
  setIngs(prev => prev.filter(i => i.id !== id));
}


  if (!uid) return <p>Sign in to view your account.</p>;

  return (
    <div style={{ display:'grid', gap:16 }}>
      <h2>My Account</h2>

      <ProfileEditor /> 

      <section>
        <h3>Your Recipes</h3>
        {recipes.length===0 ? <p>No recipes yet. <Link to="/create">Create one</Link>.</p> : (
            <ul style={{ paddingLeft:16 }}>
            {recipes.map(r => (
                <li key={r.id}>
                <Link to={`/r/${r.id}`}>{r.title}</Link>
                <span style={{ marginLeft:8, opacity:.7 }}>{new Date(r.created_at).toLocaleString()}</span>
                <button style={{ marginLeft:12 }} onClick={()=>togglePublic(r.id, r.is_public)}>
                    {r.is_public ? 'Make Private' : 'Make Public'}
                </button>
                <button style={{ marginLeft:8, color:'red' }} onClick={()=>deleteRecipe(r.id)}>
                    🗑 Delete
                </button>
                </li>
            ))}
            </ul>
        )}
      </section>

      <section>
        <h3>Added Recipes</h3>
        {added.length===0 ? <p>You haven’t added any public recipes yet.</p> : (
            <ul style={{ paddingLeft:16 }}>
            {added.map(a => (
                <li key={a.id}>
                <Link to={`/r/${a.recipe.id}`}>{a.recipe.title}</Link>
                <span style={{ marginLeft:8, opacity:.7 }}>
                    {new Date(a.recipe.created_at).toLocaleString()}
                </span>
                <button style={{ marginLeft:8, color:'red' }} onClick={async ()=>{
                    if (!confirm("Remove from your added recipes?")) return;
                    await supabase.from("user_added_recipes").delete().eq("id", a.id);
                    setAdded(prev => prev.filter(x => x.id !== a.id));
                }}>
                    🗑 Remove
                </button>
                </li>
            ))}
            </ul>
        )}
      </section>
    </div>
  );
}
