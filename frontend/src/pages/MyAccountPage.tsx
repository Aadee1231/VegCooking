import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

type Recipe = { id:number; title:string; is_public:boolean; created_at:string };
type Ingredient = { id:number; name:string };

export default function MyAccountPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ings, setIngs] = useState<Ingredient[]>([]);

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

      const { data: g } = await supabase
        .from('ingredients')
        .select('id,name')
        .eq('created_by', userId)
        .order('name');
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

  if (!uid) return <p>Sign in to view your account.</p>;

  return (
    <div style={{ display:'grid', gap:16 }}>
      <h2>My Account</h2>

      <section>
        <h3>My Recipes</h3>
        {recipes.length===0 ? <p>No recipes yet. <Link to="/create">Create one</Link>.</p> : (
          <ul style={{ paddingLeft:16 }}>
            {recipes.map(r => (
              <li key={r.id} style={{ marginBottom:6 }}>
                <Link to={`/r/${r.id}`}>{r.title}</Link>
                <span style={{ marginLeft:8, opacity:.7 }}>{new Date(r.created_at).toLocaleString()}</span>
                <button style={{ marginLeft:12 }} onClick={()=>togglePublic(r.id, r.is_public)}>
                  {r.is_public ? 'Make Private' : 'Make Public'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>My Ingredients</h3>
        {ings.length===0 ? <p>You haven’t added any ingredients yet.</p> : (
          <ul style={{ paddingLeft:16 }}>
            {ings.map(i => <li key={i.id}>{i.name}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
