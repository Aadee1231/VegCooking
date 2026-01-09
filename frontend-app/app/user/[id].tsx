import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { resolveImageUrl } from "../../src/lib/images";
import { Ionicons } from "@expo/vector-icons";

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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    async function load() {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,bio,location,dietary_prefs")
        .eq("id", id)
        .single();

      if (!alive) return;
      setProfile(prof as Profile);

      const { data: recs } = await supabase
        .from("recipes")
        .select("id,title,caption,created_at,image_url")
        .eq("user_id", id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (!alive) return;
      setRecipes(recs ?? []);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);



  if (loading || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <Pressable
        onPress={() => router.back()}
        style={{ position: "absolute", top: 50, left: 16, zIndex: 10 }}
      >
        <Ionicons name="chevron-back" size={28} color="#2e7d32" />
      </Pressable>

      {/* --- Profile Header --- */} 
      <View
        style={{
          padding: 24,
          alignItems: "center",
          backgroundColor: "#f3f6f3",
        }}
      >
        <Image
          source={
            profile.avatar_url
              ? { uri: resolveImageUrl("profile-avatars", profile.avatar_url) }
              : require("../../assets/avatarplaceholder.png")
          }
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 4, 
            borderColor: "#2e7d32",
          }}
        /> 


        <Text
          style={{
            marginTop: 12,
            fontSize: 24,
            fontWeight: "800",
            color: "#2e7d32",
          }}
        >
          {profile.username ?? "Unnamed Chef"}
        </Text>

        {profile.location && (
          <Text style={{ marginTop: 4, color: "#777" }}>
            📍 {profile.location}
          </Text>
        )}

        {profile.bio && (
          <Text
            style={{
              marginTop: 8,
              textAlign: "center",
              color: "#444",
              lineHeight: 20,
            }}
          >
            {profile.bio}
          </Text>
        )}

        {profile.dietary_prefs && profile.dietary_prefs.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            {profile.dietary_prefs.map((p) => (
              <View
                key={p}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  backgroundColor: "#e8f5e9",
                }}
              >
                <Text style={{ fontSize: 13, color: "#2e7d32" }}>{p}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* --- Recipes --- */}
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#2e7d32",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Public Recipes
        </Text>

        {recipes.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#777" }}>
            No public recipes yet.
          </Text>
        ) : (
          recipes.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/recipe/${r.id}`)}
              style={{
                marginBottom: 16,
                backgroundColor: "white",
                borderRadius: 16,
                overflow: "hidden",
                elevation: 2,
              }}
            >
              {r.image_url && (
                <Image
                  source={{ uri: resolveImageUrl("recipe-media", r.image_url) }}
                  style={{ width: "100%", height: 160 }}
                />
              )}

              <View style={{ padding: 12 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2e7d32",
                  }}
                >
                  {r.title}
                </Text>

                {r.caption && (
                  <Text style={{ color: "#777", marginTop: 4 }}>
                    {r.caption}
                  </Text>
                )}

                <Text style={{ color: "#999", marginTop: 6, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
