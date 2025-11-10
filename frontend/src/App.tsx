import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
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
  const [profile, setProfile] = useState<{ username?: string | null; avatar_url?: string | null }>({});
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [focused, setFocused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("vc_theme") as "light" | "dark") || "light"
  );

  const navigate = useNavigate();
  const location = useLocation();
  const protectedRoutes = ["/create", "/plan", "/me", "/r", "/u"];
  const needsAuth = protectedRoutes.some((r) => location.pathname.startsWith(r));

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vc_theme", theme);
  }, [theme]);

  // Session + Profile
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

        // Search recipes by title
        const { data: recipes } = await supabase
        .from("recipes")
        .select("id, title, caption, image_url")
        .ilike("title", `%${term}%`)
        .limit(3);
        (recipes ?? []).forEach((r) =>
        res.push({
            id: r.id,
            type: "recipe",
            title: r.title,
            subtitle: r.caption ?? undefined,
            image: r.image_url,
        })
        );

        // Search users by username
        const { data: users } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
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

        // Search tags (from recipe table)
        const { data: tags } = await supabase.from("recipes").select("tags").not("tags", "is", null);
        const uniqueTags = new Set<string>();
        (tags ?? []).forEach((r: any) =>
        (r.tags ?? []).forEach((t: string) => {
            if (t.toLowerCase().includes(term)) uniqueTags.add(t);
        })
        );
        Array.from(uniqueTags)
        .slice(0, 5)
        .forEach((tag) => res.push({ id: tag, type: "tag", title: `#${tag}` }));

        setResults(res);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);


  async function signOut() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  function avatarUrl(path: string | null | undefined) {
    if (!path) return "/default-avatar.svg";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }

  function imgUrl(path: string | null | undefined) {
    if (!path) return null;
    return supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl;
  }

  return (
    <>
      <header>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 className="brand">VegCooking</h1>
        </Link>

        {/* Search Bar */}
        <div style={{ position: "relative", flex: "0 1 480px" }}>
          <input
            type="text"
            placeholder="Search recipes, users, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 180)}
            style={{ width: "100%" }}
          />
          {focused && results.length > 0 && (
            <div
              className="card fade-in"
              style={{
                position: "absolute",
                top: "105%",
                left: 0,
                right: 0,
                zIndex: 200,
                borderRadius: 12,
              }}
            >
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  to={r.type === "recipe" ? `/r/${r.id}` : r.type === "user" ? `/u/${r.id}` : `/?tag=${encodeURIComponent(r.id)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderBottom: "1px solid #eaeaea",
                  }}
                  onClick={() => setSearch("")}
                >
                  {r.image && (
                    <img
                      src={r.type === "user" ? avatarUrl(r.image)! : imgUrl(r.image)!}
                      alt=""
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: r.type === "user" ? "50%" : 8,
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div>
                    <strong>{r.title}</strong>
                    {r.subtitle && <div style={{ fontSize: ".8rem", color: "#777" }}>{r.subtitle}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button className="btn-secondary" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <Link to="/">Feed</Link>
          <Link to="/create">Create</Link>
          <Link to="/plan">Meal Plan</Link>
          <Link to="/me">My Account</Link>
          {userEmail ? (
            <>
              <img className="avatar" src={avatarUrl(profile.avatar_url)} alt="avatar" />
              <button className="btn" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <Link to="/auth">Sign in</Link>
          )}
        </nav>
      </header>

      <main className="app-layout">
        <div className="main-feed">
          {needsAuth && !userEmail ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <h2 style={{ color: "var(--brand)", marginBottom: 10 }}>
                Sign in or create an account to access this feature
              </h2>
              <Link to="/auth" className="btn">
                Go to Sign In
              </Link>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      <footer>© {new Date().getFullYear()} VegCooking — Share & Explore Recipes</footer>
    </>
  );
}
