import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useEffect, useState } from 'react';

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <header style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
        <h1 style={{ marginRight:'auto' }}>VegCooking</h1>
        <Link to="/">Feed</Link>
        <Link to="/create">Create</Link>
        <Link to="/plan">Meal Plan</Link>
        <Link to="/me">My Account</Link>
        {userEmail ? (
          <>
            <span>Signed in: {userEmail}</span>
            <button onClick={signOut}>Sign out</button>
          </>
        ) : (
          <Link to="/auth">Sign in</Link>
        )}
      </header>
      <Outlet />
    </div>
  );
}