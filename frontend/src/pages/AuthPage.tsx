import { type FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin'|'signup'>('signup');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  async function ensureProfile() {
    const { data: u } = await supabase.auth.getUser();
    const id = u.user?.id;
    if (!id) return;
    const username = email.split('@')[0];
    await supabase.from('profiles').upsert({ id, username, full_name: username });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password: pwd });
        if (error) throw error;
        await ensureProfile();
        setMsg('Check your inbox (if email confirmation enabled) or you are signed in!');
        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        await ensureProfile();
        navigate('/');
      }
    } catch (err: any) {
      setMsg(err.message ?? 'Auth error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>{mode === 'signup' ? 'Create account' : 'Sign in'}</h2>
      <form onSubmit={onSubmit} style={{ display:'grid', gap:8, maxWidth:360 }}>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <button disabled={loading}>{loading ? '...' : (mode === 'signup' ? 'Sign up' : 'Sign in')}</button>
      </form>
      <p style={{ marginTop:8 }}>
        {mode === 'signup' ? 'Have an account?' : "Don't have an account?"}{' '}
        <button onClick={()=>setMode(mode==='signup'?'signin':'signup')}>
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </button>
      </p>
      {msg && <p>{msg}</p>}
    </div>
  );
}
