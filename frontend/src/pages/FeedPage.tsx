import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string; // must be exposed by public_recipes_with_stats
};

type Profile = { id: string; username: string | null; avatar_url: string | null };

export default function FeedPage() {
  const [items, setItems] = useState<Recipe[]>([]);
  const [liking, setLiking] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setUserId(session.session?.user?.id ?? null);

      const { data, error } = await supabase
        .from('public_recipes_with_stats')
        .select('*') // must include user_id
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) { console.error(error); return; }
      setItems((data ?? []) as any);

      // Load author profiles in one batch
      const list = (data ?? []) as any[];
      const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id,username,avatar_url')
          .in('id', userIds);

        const map: Record<string, Profile> = {};
        (profs ?? []).forEach(p => { map[p.id] = p as any; });
        setProfileMap(map);
      }
    })();
  }, []);

  async function toggleLike(recipeId: number) {
    if (!userId) { alert('Sign in to like'); return; }
    setLiking(recipeId);
    try {
      const { error } = await supabase.from('likes').insert({ user_id: userId, recipe_id: recipeId });
      if (error) {
        // Already liked → unlike
        await supabase.from('likes').delete().eq('user_id', userId).eq('recipe_id', recipeId);
      }
      // Refresh this card's counts
      const { data } = await supabase
        .from('public_recipes_with_stats')
        .select('*')
        .eq('id', recipeId)
        .single();
      setItems(prev => prev.map(it => it.id === recipeId ? (data as Recipe) : it));
    } finally {
      setLiking(null);
    }
  }

  async function addToMyRecipes(recipeId: number) {
    if (!userId) { alert('Sign in to add recipes'); return; }
    const { error } = await supabase.from('user_added_recipes').insert({
      user_id: userId,
      recipe_id: recipeId
    });
    if (error) {
      if ((error as any).code === '23505') {
        alert('Already added to your recipes');
      } else {
        alert(error.message);
      }
    } else {
      alert('Recipe added to your account!');
    }
  }

  function imgUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from('recipe-media').getPublicUrl(path).data.publicUrl;
  }
  function avatarUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2>Discover</h2>
      {items.map(r => {
        const author = profileMap[r.user_id];
        return (
          <article key={r.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            {r.image_url && (
              <img
                src={imgUrl(r.image_url)!}
                alt=""
                style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8 }}
              />
            )}

            <h3 style={{ margin: '8px 0' }}>
              <Link to={`/r/${r.id}`}>{r.title}</Link>
            </h3>

            {/* Author credit */}
            {author && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
                {author.avatar_url && (
                  <img
                    src={avatarUrl(author.avatar_url)!}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%' }}
                  />
                )}
                <span style={{ fontSize: 13, opacity: .85 }}>
                  by {author.username ?? 'Unknown cook'}
                </span>
              </div>
            )}

            {r.caption && <p>{r.caption}</p>}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => toggleLike(r.id)} disabled={liking === r.id}>
                {liking === r.id ? '...' : '♥'} {r.likes_count}
              </button>
              <span>💬 {r.comments_count}</span>
              <button onClick={() => addToMyRecipes(r.id)}>➕ Add</button>
              <span style={{ marginLeft: 'auto', opacity: .7 }}>
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
          </article>
        );
      })}
      {items.length === 0 && <p>No public recipes yet. Create one!</p>}
    </div>
  );
}
