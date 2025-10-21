import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Profile = { id: string; username: string | null; avatar_url: string | null };
type Recipe = { id: number; title: string; caption: string | null; image_url: string | null; created_at: string; is_public: boolean };

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("id,username,avatar_url").eq("id", id).single();
      setProfile(p as any);

      const { data: recs } = await supabase
        .from("recipes")
        .select("id,title,caption,image_url,created_at,is_public")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      // show public ones + your own if it’s you (optional enhancement omitted for simplicity)
      setRecipes((recs ?? []).filter((r: any) => r.is_public));
      setLoading(false);
    })();
  }, [id]);

  function avatarUrl(path: string | null) {
    if (!path) return "/default-avatar.png";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }
  function imgUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl;
  }

  if (!profile) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading user…</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem" }}>
      <section className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
        <img
          src={avatarUrl(profile.avatar_url)!}
          alt=""
          style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #2e7d32" }}
        />
        <h2 style={{ marginTop: 12, color: "#2e7d32" }}>{profile.username ?? "User"}</h2>
        <p style={{ color: "#666", fontSize: ".95rem" }}>{recipes.length} Public Recipes</p>
      </section>

      <section>
        <h3 style={{ color: "#2e7d32" }}>Public Recipes</h3>
        {loading ? (
          <p style={{ color: "#777", marginTop: "1rem" }}>Loading…</p>
        ) : recipes.length === 0 ? (
          <p style={{ color: "#777", marginTop: "1rem" }}>No public recipes yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            {recipes.map((r) => (
              <div key={r.id} className="card" style={{ overflow: "hidden" }}>
                {r.image_url && (
                  <Link to={`/r/${r.id}`}>
                    <img src={imgUrl(r.image_url)!} alt={r.title} style={{ width: "100%", height: 180, objectFit: "cover", borderBottom: "1px solid #eee" }} />
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

      <style>{`
        @media (max-width: 900px){
          div[style*="grid-template-columns: 340px 1fr"]{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
