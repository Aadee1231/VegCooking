import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

type Profile = { id: string; username: string | null; avatar_url: string | null };
type Recipe = { id: number; title: string; caption: string | null; image_url: string | null; created_at: string; };

export default function MyAccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownRecipes, setOwnRecipes] = useState<Recipe[]>([]);
  const [addedRecipes, setAddedRecipes] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"own" | "added">("own");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchProfile(uid);
    });
  }, []);

  async function fetchProfile(uid: string) {
    const { data: p } = await supabase.from("profiles").select("id,username,avatar_url").eq("id", uid).single();
    setProfile(p);
    fetchRecipes(uid);
  }

  async function fetchRecipes(uid: string) {
    setLoading(true);
    const [{ data: own }, { data: added }] = await Promise.all([
      supabase.from("recipes").select("id,title,caption,image_url,created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("user_added_recipes").select("recipe:recipes(id,title,caption,image_url,created_at)").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    setOwnRecipes(own || []);
    setAddedRecipes((added ?? []).map((a: any) => a.recipe));
    setLoading(false);
  }

  function avatarUrl(path: string | null) {
    if (!path) return "/default-avatar.png";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }
  function imgUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl;
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const path = `${userId}/avatar_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("profile-avatars").upload(path, file, { upsert: true });
    if (error) return alert("Upload failed: " + error.message);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    fetchProfile(userId);
  }

  if (!profile) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading profile...</p>;

  const activeRecipes = tab === "own" ? ownRecipes : addedRecipes;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem" }}>
      {/* === LEFT: Profile Card === */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ position: "relative" }}>
            <img
              src={avatarUrl(profile.avatar_url)!}
              alt="Profile Avatar"
              style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #2e7d32" }}
            />
            <label
              title="Change Avatar"
              style={{
                position: "absolute", bottom: 0, right: 0,
                background: "#2e7d32", color: "#fff", width: 34, height: 34, display: "grid", placeItems: "center",
                borderRadius: "50%", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,.15)"
              }}
            >
              ⬆
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.5rem", color: "#2e7d32", marginBottom: 6 }}>
              {profile.username ?? "Your Profile"}
            </h2>
            <p style={{ color: "#666", fontSize: ".95rem" }}>
              {ownRecipes.length} Recipes • {addedRecipes.length} Saved
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: 8 }}>
            <button onClick={() => setTab("own")} className={tab === "own" ? "btn" : "btn btn-secondary"}>
              Your Recipes
            </button>
            <button onClick={() => setTab("added")} className={tab === "added" ? "btn" : "btn btn-secondary"}>
              Added Recipes
            </button>
          </div>
        </div>
      </section>

      {/* === RIGHT: Recipes Grid === */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ color: "#2e7d32" }}>{tab === "own" ? "Your Recipes" : "Saved Recipes"}</h3>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "#777", marginTop: "1rem" }}>Loading recipes...</p>
        ) : activeRecipes.length === 0 ? (
          <p style={{ textAlign: "center", color: "#777", marginTop: "1rem" }}>
            {tab === "own" ? "You haven’t created any recipes yet." : "You haven’t added any recipes yet."}
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {activeRecipes.map((r) => (
              <div key={r.id} className="card" style={{ overflow: "hidden" }}>
                {r.image_url && (
                  <Link to={`/r/${r.id}`}>
                    <img
                      src={imgUrl(r.image_url)!}
                      alt={r.title}
                      style={{ width: "100%", height: 180, objectFit: "cover", borderBottom: "1px solid #eee" }}
                    />
                  </Link>
                )}
                <div style={{ padding: "12px 14px" }}>
                  <h4 style={{ fontSize: "1rem", color: "#2e7d32", marginBottom: 6, fontWeight: 700 }}>
                    <Link to={`/r/${r.id}`}>{r.title}</Link>
                  </h4>
                  <p style={{ color: "#666", fontSize: ".95rem", marginBottom: 6 }}>{r.caption ?? "No caption"}</p>
                  <small style={{ color: "#999" }}>{new Date(r.created_at).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* mobile stack */}
      <style>{`
        @media (max-width: 900px){
          div[style*="grid-template-columns: 340px 1fr"]{
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
