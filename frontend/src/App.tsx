import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";


type SearchResult = {
  id: number | string;
  type: "recipe" | "user" | "tag";
  title: string;
  subtitle?: string;
  image?: string | null;
};

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username?: string; avatar_url?: string | null }>({});
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  // === SESSION + PROFILE ===
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const email = data.session?.user?.email ?? null;
      const uid = data.session?.user?.id ?? null;
      setUserEmail(email);
      if (uid) {
        const { data: p } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", uid)
          .single();
        if (p) setProfile(p);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // === SEARCH FUNCTIONALITY ===
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const term = search.trim().toLowerCase();
      const res: SearchResult[] = [];

      // search recipes
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id,title,caption,image_url")
        .ilike("title", `%${term}%`)
        .limit(3);
      (recipes ?? []).forEach((r) =>
        res.push({
          id: r.id,
          type: "recipe",
          title: r.title,
          subtitle: r.caption,
          image: r.image_url,
        })
      );

      // search users
      const { data: users } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .ilike("username", `%${term}%`)
        .limit(3);
      (users ?? []).forEach((u) =>
        res.push({
          id: u.id,
          type: "user",
          title: u.username ?? "Unnamed User",
          image: u.avatar_url,
        })
      );

      // search tags
      const { data: tags } = await supabase
        .from("recipes")
        .select("tags")
        .not("tags", "is", null);
      const uniqueTags = new Set<string>();
      (tags ?? []).forEach((r: any) => {
        (r.tags ?? []).forEach((t: string) => {
          if (t.toLowerCase().includes(term)) uniqueTags.add(t);
        });
      });
      Array.from(uniqueTags).slice(0, 5).forEach((tag) =>
        res.push({ id: tag, type: "tag", title: `#${tag}` })
      );

      setResults(res);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  function avatarUrl(path: string | null) {
    if (!path) return "/default-avatar.png";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }

  return (
    <>
      {/* === HEADER === */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e0e0e0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          padding: "12px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 99,
        }}
      >
        {/* === Left: Logo === */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              fontWeight: 800,
              fontSize: "1.6rem",
              background: "linear-gradient(90deg, #2e7d32, #1b5e20)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            VegCooking
          </h1>
        </Link>

        {/* === Center: Search Bar === */}
        <div style={{ position: "relative", flex: "0 1 400px" }}>
          <input
            type="text"
            placeholder="Search recipes, users, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "0.95rem",
              background: "#fafafa",
            }}
          />
          {focused && results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "105%",
                left: 0,
                right: 0,
                background: "white",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  to={
                    r.type === "recipe"
                      ? `/r/${r.id}`
                      : r.type === "user"
                      ? `/u/${r.id}`
                      : `/?tag=${encodeURIComponent(r.id)}`
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderBottom: "1px solid #eee",
                    fontSize: "0.95rem",
                    color: "#333",
                    transition: "background 0.2s",
                  }}
                  onClick={() => setSearch("")}
                >
                  {r.image && (
                    <img
                      src={
                        r.type === "user"
                          ? avatarUrl(r.image)
                          : supabase.storage.from("recipe-media").getPublicUrl(r.image).data.publicUrl
                      }
                      alt=""
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: r.type === "user" ? "50%" : "6px",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div>
                    <strong>{r.title}</strong>
                    {r.subtitle && (
                      <div style={{ fontSize: "0.8rem", color: "#777" }}>{r.subtitle}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* === Right: Nav === */}
        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/">Feed</Link>
          <Link to="/create">Create</Link>
          <Link to="/plan">Meal Plan</Link>
          <Link to="/me">My Account</Link>
          {userEmail ? (
            <>
              {profile.avatar_url ? (
                <img
                  src={avatarUrl(profile.avatar_url)!}
                  alt="avatar"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #2e7d32",
                  }}
                />
              ) : (
                <span style={{ fontSize: "0.9rem", color: "#777" }}>{profile.username ?? "User"}</span>
              )}
              <button
                onClick={signOut}
                style={{
                  background: "#2e7d32",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth">Sign in</Link>
          )}
        </nav>
      </header>

      {/* === Main Layout === */}
    <main className="app-layout">
        <div className="main-feed">
            <Outlet />
        </div>
    </main>



      <footer>© {new Date().getFullYear()} VegCooking — Share & Explore Recipes</footer>
    </>
  );
}
