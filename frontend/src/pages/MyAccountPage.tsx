import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
  location?: string | null;
  dietary_prefs?: string[] | null;
};

type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  image_url: string | null;
  created_at: string;
};

const PREF_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Nut-Free",
  "Dairy-Free",
  "Halal",
  "Kosher",
  "Comfort Food",
];

export default function MyAccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [own, setOwn] = useState<Recipe[]>([]);
  const [added, setAdded] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"own" | "added">("own");
  const [edit, setEdit] = useState({
    username: "",
    bio: "",
    location: "",
    dietary_prefs: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) fetchProfile(id);
    });
  }, []);

  async function fetchProfile(id: string) {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", id).single();
    setProfile(p as Profile);
    setEdit({
      username: p?.username ?? "",
      bio: p?.bio ?? "",
      location: p?.location ?? "",
      dietary_prefs: p?.dietary_prefs ?? [],
    });

    const [{ data: ownR }, { data: addedR }] = await Promise.all([
      supabase.from("recipes").select("id,title,caption,image_url,created_at").eq("user_id", id),
      supabase
        .from("user_added_recipes")
        .select("recipe:recipes(id,title,caption,image_url,created_at)")
        .eq("user_id", id),
    ]);
    setOwn(ownR ?? []);
    setAdded((addedR ?? []).map((a: any) => a.recipe));
  }

  const avatarUrl = (p: string | null) =>
    p
      ? supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl
      : "/default-avatar.svg";
  const imgUrl = (p: string | null) =>
    p ? supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl : null;

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !userId) return;
    const path = `${userId}/avatar_${Date.now()}.jpg`;
    await supabase.storage.from("profile-avatars").upload(path, f, { upsert: true });
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    window.vcToast("Avatar uploaded!");
    fetchProfile(userId);
  }

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("profiles").update(edit).eq("id", userId);
    window.vcToast("Profile updated!");
    setSaving(false);
    fetchProfile(userId);
  }

  function togglePref(p: string) {
    setEdit((prev) => ({
      ...prev,
      dietary_prefs: prev.dietary_prefs.includes(p)
        ? prev.dietary_prefs.filter((x) => x !== p)
        : [...prev.dietary_prefs, p],
    }));
  }

  async function deleteRecipe(id: number) {
    await supabase.from("recipes").delete().eq("id", id);
    setOwn((prev) => prev.filter((r) => r.id !== id));
    window.vcToast("Recipe deleted!");
  }

  async function removeAddedRecipe(recipeId: number) {
    if (!userId) return;
    await supabase.from("user_added_recipes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
    setAdded((prev) => prev.filter((r) => r.id !== recipeId));
    window.vcToast("Recipe removed!");
  }

  const active = tab === "own" ? own : added;
  const filtered = active.filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fade-in" style={{ width: "100%", padding: "2rem 1rem" }}>
      {!profile ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : (
        <>
          {/* === PROFILE HEADER === */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "var(--brand-50)",
              borderRadius: 20,
              padding: "2rem",
              boxShadow: "var(--shadow-md)",
              maxWidth: 950,
              margin: "0 auto 2rem auto",
            }}
          >
            <div style={{ position: "relative" }}>
              <img
                src={avatarUrl(profile.avatar_url)}
                alt="Avatar"
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: "50%",
                  border: "4px solid var(--brand)",
                  objectFit: "cover",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
                }}
              />
              <label
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  background: "var(--brand)",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ⬆
                <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
              </label>
            </div>

            <h2 style={{ color: "var(--brand)", marginTop: "1rem", fontWeight: 800 }}>
              {edit.username || "Unnamed User"}
            </h2>
            {edit.location && <p style={{ color: "#666" }}>📍 {edit.location}</p>}
            {edit.bio && (
              <p style={{ color: "#444", marginTop: 4, maxWidth: 720, textAlign: "center" }}>{edit.bio}</p>
            )}

            {edit.dietary_prefs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {edit.dietary_prefs.map((p) => (
                  <span key={p} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: ".9rem" }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* === EDIT SECTION === */}
          <div
            className="card"
            style={{
              maxWidth: 950,
              margin: "0 auto 2.5rem auto",
              borderRadius: 18,
              padding: "1.8rem",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <h3
              style={{
                color: "var(--brand)",
                marginBottom: 14,
                textAlign: "center",
                fontSize: "1.4rem",
              }}
            >
              Edit Profile
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 14,
              }}
            >
              <input
                value={edit.username}
                onChange={(e) => setEdit({ ...edit, username: e.target.value })}
                placeholder="Username"
              />
              <input
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                placeholder="Location"
              />
            </div>

            {/* ✅ Full-width description box */}
            <textarea
              rows={4}
              value={edit.bio}
              onChange={(e) => setEdit({ ...edit, bio: e.target.value })}
              placeholder="Bio"
              style={{ marginTop: 10, width: "100%" }}
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
                justifyContent: "center",
              }}
            >
              {PREF_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePref(p)}
                  className={edit.dietary_prefs.includes(p) ? "btn" : "btn btn-secondary"}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              className="btn"
              disabled={saving}
              onClick={saveProfile}
              style={{ display: "block", margin: "20px auto 0 auto", minWidth: 180 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* === RECIPE TABS === */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <button onClick={() => setTab("own")} className={`btn ${tab === "own" ? "" : "btn-secondary"}`}>
              Created Recipes
            </button>
            <button onClick={() => setTab("added")} className={`btn ${tab === "added" ? "" : "btn-secondary"}`}>
              Saved Recipes
            </button>
          </div>

          {/* ✅ Slightly longer search box */}
          <input
            type="text"
            placeholder={`Search ${tab === "own" ? "your" : "saved"} recipes…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              display: "block",
              margin: "0 auto 1.5rem auto",
              maxWidth: 520,
              width: "100%",
            }}
          />

          {/* === RECIPE GRID === */}
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
              gap: "1.5rem",
            }}
          >
            {filtered.map((r) => (
              <div
                key={r.id}
                className="card fade-in"
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  boxShadow: "var(--shadow-md)",
                  background: "#fff",
                }}
              >
                <Link to={`/r/${r.id}`}>
                  {r.image_url && (
                    <img
                      src={imgUrl(r.image_url)!}
                      alt=""
                      style={{ width: "100%", height: 180, objectFit: "cover" }}
                    />
                  )}
                </Link>
                <div style={{ padding: "0.9rem 1rem" }}>
                  <strong style={{ color: "var(--brand)", fontSize: "1.05rem" }}>
                    <Link to={`/r/${r.id}`} style={{ textDecoration: "none", color: "var(--brand)" }}>
                      {r.title}
                    </Link>
                  </strong>
                  {r.caption && (
                    <p
                      style={{
                        fontSize: ".9rem",
                        color: "#666",
                        marginTop: 4,
                        lineHeight: 1.3,
                      }}
                    >
                      {r.caption}
                    </p>
                  )}

                  {tab === "own" ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="btn btn-secondary" onClick={() => navigate(`/edit/${r.id}`)}>
                        ✏️ Edit
                      </button>
                      <button className="btn btn-danger" onClick={() => deleteRecipe(r.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="btn btn-danger" onClick={() => removeAddedRecipe(r.id)}>
                        🗑 Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "#777",
                  gridColumn: "1 / -1",
                  marginTop: "1rem",
                }}
              >
                No recipes found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
