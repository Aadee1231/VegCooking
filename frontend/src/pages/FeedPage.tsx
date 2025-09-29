import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

type Recipe = {
  id: number; title: string; caption: string | null; image_url: string | null; created_at: string;
  likes_count: number; comments_count: number;
};

export default function FeedPage() {
  const [items, setItems] = useState<Recipe[]>([]);
  const [liking, setLiking] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setUserId(session.session?.user?.id ?? null);
      const { data, error } = await supabase
        .from('public_recipes_with_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) { console.error(error); return; }
      setItems(data as any);
    })();
  }, []);

  async function toggleLike(recipeId: number) {
    if (!userId) { alert('Sign in to like'); return; }
    setLiking(recipeId);
    try {
      // Try to insert; if constraint violation, delete instead
      const { error } = await supabase.from('likes').insert({ user_id: userId, recipe_id: recipeId });
      if (error) {
        // Probably already liked: remove
        await supabase.from('likes').delete().eq('user_id', userId).eq('recipe_id', recipeId);
      }
      // Refresh counts
      const { data } = await supabase
        .from('public_recipes_with_stats')
        .select('*').eq('id', recipeId).single();
      setItems(prev => prev.map(it => it.id===recipeId ? (data as Recipe) : it));
    } finally {
      setLiking(null);
    }
  }

  function imgUrl(path: string | null) {
    if (!path) return null;
    // public bucket → we can get a public URL
    const { data } = supabase.storage.from('recipe-media').getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <div style={{ display:'grid', gap:12 }}>
      <h2>Discover</h2>
      {items.map(r => (
        <article key={r.id} style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
          {r.image_url && <img src={imgUrl(r.image_url)!} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', borderRadius:8 }}/>}
          <h3 style={{ margin:'8px 0' }}>
            <Link to={`/r/${r.id}`}>{r.title}</Link>
          </h3>
          {r.caption && <p>{r.caption}</p>}
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button onClick={()=>toggleLike(r.id)} disabled={liking===r.id}>
              {liking===r.id ? '...' : '♥'} {r.likes_count}
            </button>
            <span>💬 {r.comments_count}</span>
            <span style={{ marginLeft:'auto', opacity:.7 }}>
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
        </article>
      ))}
      {items.length===0 && <p>No public recipes yet. Create one!</p>}
    </div>
  );
}
