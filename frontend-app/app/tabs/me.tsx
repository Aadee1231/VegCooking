import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { fmtISODate, startOfWeek } from "../../src/lib/date";
import { resolveImageUrl, uploadImage } from "../../src/lib/images";
import { supabase } from "../../src/lib/supabase";
import { toast } from "../../src/lib/toast";
import { Button, Card, H3, Muted, Screen } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";


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

type TabKey = "own" | "added";

export default function MyAccountScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [own, setOwn] = useState<Recipe[]>([]);
  const [added, setAdded] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("own");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [edit, setEdit] = useState({
    username: "",
    bio: "",
    location: "",
    dietary_prefs: [] as string[],
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) await fetchAll(id);
    })();
  }, []);

  async function fetchAll(id: string) {
    // Profile
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (pErr) {
      console.error(pErr);
      toast("Failed to load profile");
      return;
    }

    setProfile(p as Profile);
    setEdit({
      username: p?.username ?? "",
      bio: p?.bio ?? "",
      location: p?.location ?? "",
      dietary_prefs: p?.dietary_prefs ?? [],
    });

    // Recipes (created + saved)
    const [{ data: ownR, error: ownErr }, { data: addedR, error: addedErr }] = await Promise.all([
      supabase
        .from("recipes")
        .select("id,title,caption,image_url,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_added_recipes")
        .select("recipe:recipes(id,title,caption,image_url,created_at)")
        .eq("user_id", id),
    ]);

    if (ownErr) console.error(ownErr);
    if (addedErr) console.error(addedErr);

    setOwn((ownR ?? []) as any);
    setAdded((addedR ?? []).map((a: any) => a.recipe));
  }

  async function onRefresh() {
    if (!userId) return;
    setRefreshing(true);
    await fetchAll(userId);
    setRefreshing(false);
  }



  async function uploadAvatar() {
    if (!userId) return;

    // iOS permission feel
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast("Please allow photo permissions to upload an avatar.");
        return;
      }
    }
    
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1],
    });

    if (res.canceled) return;

    const img = res.assets[0];

    try {
      const uploadedPath = await uploadImage(img, "profile-avatars", `${userId}/avatar`);
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: uploadedPath }).eq("id", userId);
      if (profErr) throw profErr;
      toast("Avatar updated!");
      await fetchAll(userId);
      router.replace("/tabs/me");
    } catch (e: any) {
      console.error("Error uploading avatar:", e);
      toast(e?.message ?? "Avatar upload failed");
    }
  }

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("profiles").update(edit).eq("id", userId);
      if (error) throw error;

      toast("Profile updated!");
      await fetchAll(userId);
    } catch (e: any) {
      console.error("Error saving profile:", e);
      toast(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
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
    // nicer UX: confirm
    Alert.alert("Delete recipe?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("recipes").delete().eq("id", id);
            if (error) throw error;

            setOwn((prev) => prev.filter((r) => r.id !== id));
            toast("Recipe deleted");
          } catch (e: any) {
            console.error(e);
            toast(e?.message ?? "Delete failed");
          }
        },
      },
    ]);
  }

  async function removeAddedRecipe(recipeId: number) {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("user_added_recipes")
        .delete()
        .eq("user_id", userId)
        .eq("recipe_id", recipeId);

      if (error) throw error;

      setAdded((prev) => prev.filter((r) => r.id !== recipeId));
      toast("Recipe removed");
    } catch (e: any) {
      console.error(e);
      toast(e?.message ?? "Remove failed");
    }
  }

  const active = tab === "own" ? own : added;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((r) => (r.title ?? "").toLowerCase().includes(q));
  }, [active, query]);

  // ====== LOADING STATE ======
  if (!profile) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ======= PROFILE HEADER (Premium card) ======= */}
        <Card
          style={{
            marginHorizontal: theme.spacing(2),
            marginTop: theme.spacing(2),
            padding: theme.spacing(2),
            backgroundColor: "#e8f5e9",
          }}
        >
          <View style={{ alignItems: "center" }}>
            <View style={{ position: "relative" }}>
              <Pressable onPress={uploadAvatar} style={{ borderRadius: 72 }}>
                <View
                  style={{ 
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    borderWidth: 4,
                    borderColor: theme.colors.green ?? "#2e7d32",
                    overflow: "hidden",
                    backgroundColor: theme.colors.chip,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {profile.avatar_url ? (
                    <Image
                      source={{ uri: resolveImageUrl("profile-avatars", profile.avatar_url) }}
                      style={{ width: 140, height: 140 }}
                      onError={(error: any) => {
                        console.error('Failed to load profile avatar in me page:', profile.avatar_url, error);
                      }}
                      onLoad={() => {
                        console.log('Successfully loaded profile avatar in me page:', profile.avatar_url);
                      }}
                    />
                  ) : (
                    <Ionicons name="person" size={56} color={theme.colors.subtext} />
                  )}
                </View>
              </Pressable>

              {/* upload button */}
              <Pressable
                onPress={uploadAvatar}
                style={{
                  position: "absolute",
                  right: 6,
                  bottom: 6,
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: theme.colors.green ?? "#2e7d32",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              </Pressable>
            </View>

            <Text style={{ marginTop: 12, fontSize: 22, fontWeight: "900", color: theme.colors.green ?? "#2e7d32" }}>
              {edit.username || "Unnamed User"}
            </Text>

            {!!edit.location && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Ionicons name="location-sharp" size={16} color={theme.colors.subtext} />
                <Text style={{ color: theme.colors.subtext }}>{edit.location}</Text>
              </View>
            )}

            {!!edit.bio && (
              <Text style={{ marginTop: 8, color: theme.colors.text, textAlign: "center" }}>
                {edit.bio}
              </Text>
            )}

            {/* prefs chips (selected) */}
            {!!edit.dietary_prefs?.length && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 12 }}>
                {edit.dietary_prefs.map((p) => (
                  <View
                    key={p}
                    style={{
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: theme.colors.green ?? "#2e7d32", fontWeight: "800" }}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* quick stats */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <View style={statPillStyle()}>
                <Text style={statNumStyle()}>{own.length}</Text>
                <Text style={statLabelStyle()}>Created</Text>
              </View>
              <View style={statPillStyle()}>
                <Text style={statNumStyle()}>{added.length}</Text>
                <Text style={statLabelStyle()}>Saved</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card style={{ marginHorizontal: theme.spacing(2), marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
          <H3 style={{ textAlign: "center", color: theme.colors.green ?? "#2e7d32" }}>Groceries</H3>

          <View style={{ marginTop: 12 }}>
            <Button
              label="View This Week's Grocery List"
              onPress={() => {
                const weekIso = fmtISODate(startOfWeek(new Date()));
                router.push(`/tabs/grocery?week=${weekIso}`);
              }}
            />
          </View>

          <Muted style={{ marginTop: 10, textAlign: "center" }}>
            Your grocery list auto-builds from recipes in your Meal Planner.
          </Muted>
        </Card>


        {/* ======= EDIT PROFILE ======= */}
        <Card style={{ marginHorizontal: theme.spacing(2), marginTop: theme.spacing(2), padding: theme.spacing(2) }}>
          <H3 style={{ textAlign: "center", color: theme.colors.green ?? "#2e7d32" }}>Edit Profile</H3>

          <View style={{ marginTop: 12, gap: 10 }}>
            <LabeledInput
              label="Username"
              value={edit.username}
              placeholder="Your name"
              onChangeText={(t) => setEdit((p) => ({ ...p, username: t }))}
              icon="person-outline"
            />
            <LabeledInput
              label="Location"
              value={edit.location}
              placeholder="City (ex. Raleigh)"
              onChangeText={(t) => setEdit((p) => ({ ...p, location: t }))}
              icon="location-outline"
            />
            <LabeledTextArea
              label="Bio"
              value={edit.bio}
              placeholder="Tell people who you are as a cook…"
              onChangeText={(t) => setEdit((p) => ({ ...p, bio: t }))}
              icon="chatbubble-ellipses-outline"
            />
          </View>

          <View style={{ marginTop: 14 }}>
            <Muted style={{ marginBottom: 8, fontWeight: "800" }}>Dietary Preferences</Muted>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {PREF_OPTIONS.map((p) => {
                const active = edit.dietary_prefs.includes(p);
                return (
                  <Pressable
                    key={p}
                    onPress={() => togglePref(p)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: active ? (theme.colors.green ?? "#2e7d32") : theme.colors.chip,
                      borderWidth: 1,
                      borderColor: active ? (theme.colors.green ?? "#2e7d32") : theme.colors.border,
                    }}
                  >
                    <Text style={{ color: active ? "#fff" : theme.colors.text, fontWeight: "800" }}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 14 }}>
              <Button label={saving ? "Saving..." : "Save Changes"} onPress={saveProfile} disabled={saving} />
            </View>
          </View>
        </Card>

        {/* ======= RECIPE TABS ======= */}
        <View style={{ marginTop: theme.spacing(2), paddingHorizontal: theme.spacing(2) }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Created Recipes"
                variant={tab === "own" ? "primary" : "ghost"}
                onPress={() => setTab("own")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Saved Recipes"
                variant={tab === "added" ? "primary" : "ghost"}
                onPress={() => setTab("added")}
              />
            </View>
          </View>

          {/* Search */}
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#fff",
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.subtext} />
            <TextInput
              placeholder={`Search ${tab === "own" ? "your" : "saved"} recipes…`}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              style={{ flex: 1, fontSize: 15 }}
              placeholderTextColor={theme.colors.subtext}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={theme.colors.subtext} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ======= RECIPE GRID (mobile friendly) ======= */}
        <View style={{ paddingHorizontal: theme.spacing(2), marginTop: theme.spacing(2) }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 22 }}>
              <Ionicons name="restaurant-outline" size={26} color={theme.colors.subtext} />
              <Text style={{ marginTop: 10, color: theme.colors.subtext }}>No recipes found.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {filtered.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  tab={tab}
                  onOpen={() => router.push(`/recipe/${r.id}`)}
                  onEdit={() =>
                    router.push({
                      pathname: "/tabs/create",
                      params: { id: String(r.id) },
                    })
                  }
                  onDelete={() => deleteRecipe(r.id)}
                  onRemove={() => removeAddedRecipe(r.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ======= ACCOUNT ACTIONS ======= */}
        <Card
          style={{
            marginHorizontal: theme.spacing(2),
            marginTop: theme.spacing(3),
            marginBottom: theme.spacing(3),
            padding: theme.spacing(2),
          }}
        >
          <H3 style={{ textAlign: "center" }}>Account</H3>

          <View style={{ marginTop: 12, gap: 10 }}>
            {/* Switch account (future-proof) */}
            <Pressable
              onPress={() => {
                // for now just log out
                // later you can route to an account switcher
                router.replace("/auth");
              }}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: theme.colors.text }}>
                Switch account
              </Text>
            </Pressable>

            {/* Logout */}
            <Pressable
              onPress={() => {
                Alert.alert("Log out?", "You’ll need to sign in again.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log out",
                    style: "destructive",
                    onPress: async () => {
                      await supabase.auth.signOut();
                      router.replace("/auth");
                    },
                  },
                ]);
              }}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "#ffebee",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: "#c62828" }}>
                Log out
              </Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

/** ===== UI helpers / subcomponents ===== */

function statPillStyle() {
  return {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center" as const,
    minWidth: 110,
  };
}
function statNumStyle() {
  return { fontSize: 18, fontWeight: "900" as const, color: theme.colors.text };
}
function statLabelStyle() {
  return { fontSize: 12, marginTop: 2, color: theme.colors.subtext, fontWeight: "800" as const };
}

function LabeledInput(props: {
  label: string;
  icon?: any;
  value: string;
  placeholder?: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View>
      <Muted style={{ marginBottom: 6, fontWeight: "800" }}>{props.label}</Muted>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        {props.icon ? <Ionicons name={props.icon} size={18} color={theme.colors.subtext} /> : null}
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.subtext}
          style={{ flex: 1, fontSize: 15, color: theme.colors.text }}
        />
      </View>
    </View>
  );
}

function LabeledTextArea(props: {
  label: string;
  icon?: any;
  value: string;
  placeholder?: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View>
      <Muted style={{ marginBottom: 6, fontWeight: "800" }}>{props.label}</Muted>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        {props.icon ? (
          <View style={{ paddingTop: 2 }}>
            <Ionicons name={props.icon} size={18} color={theme.colors.subtext} />
          </View>
        ) : null}
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.subtext}
          style={{ flex: 1, fontSize: 15, color: theme.colors.text, minHeight: 90 }}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

function RecipeCard(props: {
  recipe: { id: number; title: string; caption: string | null; image_url: string | null };
  tab: "own" | "added";
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemove: () => void;
}) {
  const image = props.recipe.image_url ? resolveImageUrl("recipe-media", props.recipe.image_url) : undefined;
  console.log("Recipe image:", image);

  return (
    <View style={{ width: "48%" }}>
      <Card style={{ overflow: "hidden" }}>
        <Pressable onPress={props.onOpen}>
          <View
            style={{
              width: "100%",
              height: 120,
              backgroundColor: theme.colors.chip,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {image ? (
              <Image 
                source={{ uri: image }} 
                style={{ width: "100%", height: 120 }} 
                onError={(error) => {
                  console.error('Failed to load recipe image in me page:', props.recipe.image_url, image, error);
                  console.error('Error details:', error.nativeEvent);
                }}
                onLoad={() => {
                  console.log('Successfully loaded recipe image in me page:', props.recipe.image_url, image);
                }}
              />
            ) : (
              <Ionicons name="image-outline" size={26} color={theme.colors.subtext} />
            )}
          </View>
        </Pressable>

        <View style={{ padding: 10 }}>
          <Text numberOfLines={1} style={{ fontWeight: "900", color: theme.colors.green ?? "#2e7d32" }}>
            {props.recipe.title}
          </Text>

          {!!props.recipe.caption && (
            <Text numberOfLines={2} style={{ marginTop: 4, color: theme.colors.subtext, fontSize: 12, lineHeight: 16 }}>
              {props.recipe.caption}
            </Text>
          )}

          {props.tab === "own" ? (
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                marginTop: 10,
              }}
            >
              {/* EDIT */}
              <Pressable
                onPress={props.onEdit}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: "#e8f5e9",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={theme.colors.green ?? "#2e7d32"}
                />
              </Pressable>


              {/* DELETE */}
              <Pressable
                onPress={props.onDelete}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: "#ffebee",
                  borderWidth: 1,
                  borderColor: "#ffcdd2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#c62828"
                />
              </Pressable>


            </View>

          ) : (
            <Pressable
              onPress={props.onRemove}
              style={{
                marginTop: 10,
                backgroundColor: "#ffebee",
                paddingVertical: 9,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#ffcdd2",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#c62828" />
              <Text style={{ fontWeight: "900", color: "#c62828" }}>Remove</Text>
            </Pressable>
          )}
        </View>
      </Card>
    </View>
  );
}
