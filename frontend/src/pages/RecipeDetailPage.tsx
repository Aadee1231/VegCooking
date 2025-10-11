import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Step = { position: number; body: string; timer_seconds: number | null };
type Line = { position: number; quantity: number | null; unit_code: string | null; notes: string | null; ingredient: { id:number; name:string } };
type Recipe = {
  id: number; title: string; caption: string | null; description: string | null;
  user_id: string; is_public: boolean; image_url: string | null; created_at: string;
};
type CommentRow = { id:number; body:string; created_at:string; user_id:string };
type Profile = { id:string; username:string|null; avatar_url:string|null };

export default function RecipeDetailPage() {
  const { id } = useParams<{id:string}>();
  const recipeId = Number(id);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid);

      // 1) recipe (visible if public or mine)
      const { data: rec, error: recErr } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .maybeSingle();
      if (recErr || !rec) { alert('Recipe not found or not visible'); return; }
      setRecipe(rec as any);

      // author profile
      if ((rec as any).user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id,username,avatar_url')
          .eq('id', (rec as any).user_id)
          .maybeSingle();
        setAuthor((prof ?? null) as any);
      }

      // 2) steps
      const { data: st } = await supabase
        .from('recipe_steps')
        .select('position,body,timer_seconds')
        .eq('recipe_id', recipeId)
        .order('position');
      setSteps((st ?? []) as any);

      // 3) ingredients (joined)
      const { data: ri } = await supabase
        .from('recipe_ingredients')
        .select('position,quantity,unit_code,notes,ingredient:ingredients(id,name)')
        .eq('recipe_id', recipeId)
        .order('position');
      setLines((ri ?? []) as any);

      // 4) image public URL
      if ((rec as any).image_url) {
        const { data } = supabase.storage.from('recipe-media').getPublicUrl((rec as any).image_url);
        setImgUrl(data.publicUrl);
      }

      // 5) comments
      const { data: cm } = await supabase
        .from('comments')
        .select('id,body,created_at,user_id')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: true });
      setComments((cm ?? []) as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  function avatarUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
  }

  async function postComment() {
    if (!userId) { alert('Sign in to comment'); return; }
    const body = newComment.trim();
    if (!body) return;
    const { data, error } = await supabase
      .from('comments')
      .insert({ recipe_id: recipeId, user_id: userId, body })
      .select('id,body,created_at,user_id')
      .single();
    if (error) { alert(error.message); return; }
    setComments(prev => [...prev, data as any]);
    setNewComment('');
  }

  if (!recipe) return <div>Loading…</div>;

  return (
    <div style={{ display:'grid', gap:12 }}>
      <h2>{recipe.title}</h2>

      {/* Author credit */}
      {author && (
        <div style={{ display:'flex', alignItems:'center', gap:10, margin:'6px 0 4px' }}>
          {author.avatar_url && (
            <img
              src={avatarUrl(author.avatar_url)!}
              alt=""
              style={{ width:28, height:28, borderRadius:'50%' }}
            />
          )}
          <span style={{ fontSize:13, opacity:.85 }}>
            by {author.username ?? 'Unknown cook'}
          </span>
        </div>
      )}

      {imgUrl && <img src={imgUrl} alt="" style={{ width:'100%', maxHeight:360, objectFit:'cover', borderRadius:8 }}/>}
      {recipe.caption && <p><em>{recipe.caption}</em></p>}
      {recipe.description && <p>{recipe.description}</p>}

      <section>
        <h3>Ingredients</h3>
        <ul>
          {lines.map(l => (
            <li key={l.position}>
              {l.quantity ?? ''} {l.unit_code ?? ''} {l.ingredient?.name}
              {l.notes ? ` — ${l.notes}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Steps</h3>
        <ol>
          {steps.map(s => (
            <li key={s.position}>
              {s.body} {s.timer_seconds ? `(${s.timer_seconds}s)` : ''}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3>Comments</h3>
        <div style={{ display:'grid', gap:8 }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding:8, border:'1px solid #eee', borderRadius:6 }}>
              <div style={{ fontSize:12, opacity:.7 }}>{new Date(c.created_at).toLocaleString()}</div>
              <div>{c.body}</div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8 }}>
            <input
              style={{ flex:1 }}
              placeholder="Add a comment…"
              value={newComment}
              onChange={e=>setNewComment(e.target.value)}
            />
            <button onClick={postComment}>Post</button>
          </div>
        </div>
      </section>
    </div>
  );
}
