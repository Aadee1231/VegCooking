import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

function publicUrl(path: string | null) {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export default function ProfileEditor() {
  const [uid, setUid] = useState<string | null>(null);
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id ?? null;
      setUid(userId);
      if (!userId) return;

      // Try to get existing, don’t crash if missing
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,bio,avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) console.warn(error.message);

      // Create a default row if none exists yet
      if (!data) {
        const defaultUsername = (sess.session?.user?.email ?? "")
          .split("@")[0]
          .slice(0, 20);
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            username: defaultUsername || `user_${userId.slice(0, 8)}`,
            full_name: defaultUsername || null,
          })
          .select("id,username,full_name,bio,avatar_url")
          .single();
        setP(inserted as Profile);
      } else {
        setP(data as Profile);
      }
    })();
  }, []);

  const avatarSrc = useMemo(() => publicUrl(p?.avatar_url ?? null), [p?.avatar_url]);

  async function onSaveBasic(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !p) return;
    setSaving(true); setMsg(null);
    try {
      const uname = (p.username ?? "").trim();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(uname)) {
        throw new Error("Username must be 3–20 chars (letters, numbers, _).");
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          username: uname,
          full_name: p.full_name,
          bio: p.bio,
        })
        .eq("id", uid);
      if (error?.message?.toLowerCase().includes("duplicate")) {
        throw new Error("That username is taken. Try another.");
      }
      setMsg("Saved!");
    } catch (e: any) {
      setMsg(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(file?: File) {
    if (!file || !uid) return;
    setSaving(true); setMsg(null);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", uid);
      if (updErr) throw updErr;

      const { data } = await supabase
        .from("profiles")
        .select("id,username,full_name,bio,avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (data) setP(data as Profile);
      setMsg("Avatar updated!");
    } catch (e: any) {
      setMsg(e.message ?? "Avatar upload failed");
    } finally {
      setSaving(false);
    }
  }

  if (!uid) return <p>Sign in to edit your profile.</p>;
  if (!p) return <p>Loading profile…</p>;

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
      <h3>My Profile</h3>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img
          src={avatarSrc ?? "https://placehold.co/80x80?text=👤"}
          alt="avatar"
          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }}
        />
        <label style={{ display: "inline-block" }}>
          <input type="file" accept="image/*" onChange={(e) => onAvatarChange(e.target.files?.[0])} style={{ display: "none" }} />
          <span style={{ display: "inline-block", padding: "6px 10px", border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}>
            Upload new avatar
          </span>
        </label>
      </div>

      <form onSubmit={onSaveBasic} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Username</div>
          <input
            value={p.username ?? ""}
            onChange={(e) => setP({ ...p, username: e.target.value })}
            placeholder="username"
          />
        </label>
        <label>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Full name</div>
          <input
            value={p.full_name ?? ""}
            onChange={(e) => setP({ ...p, full_name: e.target.value })}
            placeholder="Your name"
          />
        </label>
        <label>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Bio</div>
          <textarea
            rows={3}
            value={p.bio ?? ""}
            onChange={(e) => setP({ ...p, bio: e.target.value })}
            placeholder="A sentence about you…"
          />
        </label>
        <button disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </form>

      {msg && <p style={{ opacity: 0.8 }}>{msg}</p>}
    </section>
  );
}
