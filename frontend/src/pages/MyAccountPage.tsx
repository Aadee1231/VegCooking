import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

type Profile = { id: string; username: string | null; avatar_url: string | null };
type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  image_url: string | null;
  created_at: string;
};

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
    const { data: p } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", uid)
      .single();
    setProfile(p);
    fetchRecipes(uid);
  }

  async function fetchRecipes(uid: string) {
    setLoading(true);
    const [{ data: own }, { data: added }] = await Promise.all([
      supabase
        .from("recipes")
        .select("id,title,caption,image_url,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_added_recipes")
        .select("recipe:recipes(id,title,caption,image_url,created_at)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
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
    const { error } = await supabase.storage
      .from("profile-avatars")
      .upload(path, file, { upsert: true });
    if (error) return alert("Upload failed: " + error.message);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    fetchProfile(userId);
  }

  if (!profile)
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading profile...</p>;

  const activeRecipes = tab === "own" ? ownRecipes : addedRecipes;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* === Profile Header === */}
      <section
        className="account-page"
        style={{
          padding: "2rem 2rem 1.5rem",
          textAlign: "center",
          background: "linear-gradient(135deg, #e8f5e9, #fff)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <img
              src={avatarUrl(profile.avatar_url)!}
              alt="Profile Avatar"
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #2e7d32",
              }}
            />
            <label
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                background: "#2e7d32",
                color: "#fff",
                padding: "4px 6px",
                borderRadius: "50%",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
              title="Change Avatar"
            >
              ⬆
              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Username */}
          <div>
            <h2 style={{ fontSize: "1.6rem", color: "#2e7d32", marginBottom: "4px" }}>
              {profile.username ?? "Your Profile"}
            </h2>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              {ownRecipes.length} Recipes • {addedRecipes.length} Saved
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={() => setTab("own")}
            style={{
              background: tab === "own" ? "#2e7d32" : "#e8f5e9",
              color: tab === "own" ? "white" : "#2e7d32",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Your Recipes
          </button>
          <button
            onClick={() => setTab("added")}
            style={{
              background: tab === "added" ? "#2e7d32" : "#e8f5e9",
              color: tab === "added" ? "white" : "#2e7d32",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Added Recipes
          </button>
        </div>
      </section>

      {/* === Recipes Grid === */}
      <section>
        {loading ? (
          <p style={{ textAlign: "center", color: "#777" }}>Loading recipes...</p>
        ) : activeRecipes.length === 0 ? (
          <p style={{ textAlign: "center", color: "#777" }}>
            {tab === "own"
              ? "You haven’t created any recipes yet."
              : "You haven’t added any recipes yet."}
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "1.5rem",
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
                      style={{
                        width: "100%",
                        height: 180,
                        objectFit: "cover",
                        borderBottom: "1px solid #eee",
                      }}
                    />
                  </Link>
                )}
                <div style={{ padding: "12px 16px" }}>
                  <h4
                    style={{
                      fontSize: "1rem",
                      color: "#2e7d32",
                      marginBottom: "4px",
                      fontWeight: 600,
                    }}
                  >
                    <Link to={`/r/${r.id}`}>{r.title}</Link>
                  </h4>
                  <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "6px" }}>
                    {r.caption ?? "No caption"}
                  </p>
                  <small style={{ color: "#999" }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
