import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, Link } from "react-router-dom";
import {
  Heart,
  BookmarkSimple,
  X,
  Trash,
  PencilSimple,
  Clock,
  Fire,
  Gauge,
  MapPin,
} from "phosphor-react";  


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
  created_at: string;
  image_url: string | null;
};

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
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      setRecipes(recs ?? []);
    })();
  }, [id]);

  const avatarUrl = (path: string | null) =>
    path
      ? supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl
      : "/default-avatar.svg";
  const imgUrl = (path: string | null) =>
    path
      ? supabase.storage.from("recipe-media").getPublicUrl(path).data.publicUrl
      : null;

  if (!profile)
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>;

  return (
    <div className="fade-in" style={{ width: "100%", padding: "2rem 1rem" }}>
      {/* --- Profile Banner --- */}
      <section
        style={{
          background:
            "linear-gradient(145deg, var(--brand-50), rgba(255,255,255,0.8))",
          borderRadius: 20,
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxShadow: "var(--shadow-md)",
          maxWidth: 900,
          margin: "0 auto 2rem auto",
        }}
      >
        <img
          src={avatarUrl(profile.avatar_url)}
          alt={profile.username ?? ""}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "4px solid var(--brand)",
            objectFit: "cover",
            boxShadow: "0 4px 14px rgba(0,0,0,.1)",
          }}
        />
        <h2
          style={{
            marginTop: "1rem",
            color: "var(--brand)",
            fontWeight: 800,
            fontSize: "1.8rem",
          }}
        >
          {profile.username ?? "Unnamed Chef"}
        </h2>

        {profile.location && (
          <p style={{ color: "#777", fontSize: ".95rem" }}>📍 {profile.location}</p>
        )}
        {profile.bio && (
          <p
            style={{
              marginTop: 8,
              maxWidth: 600,
              color: "#444",
              lineHeight: 1.5,
            }}
          >
            {profile.bio}
          </p>
        )}

        {profile.dietary_prefs && profile.dietary_prefs.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            {profile.dietary_prefs.map((p) => (
              <span
                key={p}
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: ".85rem" }}
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* --- Recipes Grid --- */}
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <h3
          style={{
            color: "var(--brand)",
            marginBottom: "1rem",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "1.4rem",
          }}
        >
          Public Recipes
        </h3>

        {recipes.length === 0 ? (
          <p style={{ textAlign: "center", color: "#777" }}>
            No public recipes yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
              gap: "1.2rem",
            }}
          >
            {recipes.map((r) => (
              <Link
                key={r.id}
                to={`/r/${r.id}`}
                className="card fade-in"
                style={{
                  textAlign: "left",
                  overflow: "hidden",
                  borderRadius: 16,
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform .2s ease, box-shadow .2s ease",
                }}
              >
                {r.image_url && (
                  <img
                    src={imgUrl(r.image_url)!}
                    alt={r.title}
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "cover",
                      borderBottom: "1px solid #eee",
                    }}
                  />
                )}
                <div style={{ padding: 10 }}>
                  <strong
                    style={{
                      color: "var(--brand)",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    {r.title}
                  </strong>
                  {r.caption && (
                    <p
                      style={{
                        fontSize: ".9rem",
                        color: "#777",
                        marginTop: 2,
                      }}
                    >
                      {r.caption}
                    </p>
                  )}
                  <small style={{ color: "#999" }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
