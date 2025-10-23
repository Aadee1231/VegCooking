import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, Link } from "react-router-dom";

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
  location?: string | null;
  dietary_prefs?: string[] | null;
};

type Recipe = { id: number; title: string; caption: string | null; created_at: string; image_url: string | null };

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,bio,location,dietary_prefs")
        .eq("id", id)
        .single();
      setProfile(prof as Profile);

      const { data: recs } = await supabase
        .from("recipes")
        .select("id,title,caption,created_at,image_url")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      setRecipes(recs ?? []);
    })();
  }, [id]);

  function imgUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl;
  }
  function avatarUrl(path: string | null) {
    if (!path) return "/default-avatar.svg";
    return supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }

  if (!profile) return <p style={{ textAlign: "center" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <section className="card" style={{ width: "100%", maxWidth: 720, textAlign: "center", padding: "2rem" }}>
        <img
          src={avatarUrl(profile.avatar_url)!}
          alt={profile.username ?? ""}
          style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--brand)" }}
        />
        <h2 style={{ marginTop: "1rem", color: "var(--brand)" }}>{profile.username ?? "Unnamed"}</h2>

        {profile.location && <p style={{ color: "#777" }}>📍 {profile.location}</p>}
        {profile.bio && <p style={{ marginTop: 8 }}>{profile.bio}</p>}
        {profile.dietary_prefs && profile.dietary_prefs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {profile.dietary_prefs.map((p) => (
              <span key={p} className="btn btn-secondary" style={{ padding: "4px 10px" }}>
                {p}
              </span>
            ))}
          </div>
        )}
      </section>

      <h3 style={{ marginTop: "1.5rem", color: "var(--brand)" }}>Public Recipes</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
          gap: "1rem",
          marginTop: "1rem",
          width: "100%",
          maxWidth: 900,
        }}
      >
        {recipes.map((r) => (
          <Link key={r.id} to={`/r/${r.id}`} className="card" style={{ textAlign: "left", overflow: "hidden" }}>
            {r.image_url && (
              <img src={imgUrl(r.image_url)!} alt={r.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
            )}
            <div style={{ padding: 10 }}>
              <strong>{r.title}</strong>
              {r.caption && <p style={{ fontSize: ".9rem", color: "#888" }}>{r.caption}</p>}
              <small style={{ color: "#999" }}>{new Date(r.created_at).toLocaleDateString()}</small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
