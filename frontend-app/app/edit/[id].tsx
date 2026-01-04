import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../src/lib/supabase";
import { toast } from "../../src/lib/toast";
import { theme } from "../../src/ui/theme";
import { Screen, Card, H1, Button } from "../../src/ui/components";

type Recipe = {
  id: number;
  title: string;
  caption: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  tags?: string[] | null;
  prep_time?: string | null;
  cook_time?: string | null;
  difficulty?: string | null;
  demo_url?: string | null;
};

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    caption: "",
    description: "",
    prep_time: "",
    cook_time: "",
    difficulty: "",
  });

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setRecipe(data);
      setFormData({
        title: data.title || "",
        caption: data.caption || "",
        description: data.description || "",
        prep_time: data.prep_time || "",
        cook_time: data.cook_time || "",
        difficulty: data.difficulty || "",
      });
    } catch (error) {
      console.error("Error loading recipe:", error);
      toast("Failed to load recipe");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast("Title is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("recipes")
        .update({
          title: formData.title.trim(),
          caption: formData.caption.trim() || null,
          description: formData.description.trim() || null,
          prep_time: formData.prep_time.trim() || null,
          cook_time: formData.cook_time.trim() || null,
          difficulty: formData.difficulty.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast("Recipe updated successfully!");
      router.back();
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast("Failed to save recipe");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.green} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: "row", 
            alignItems: "center", 
            marginBottom: 24,
            gap: 12
          }}>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#111" />
            </Pressable>
            <H1>Edit Recipe</H1>
          </View>

          <Card>
            {/* Title */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                marginBottom: 8,
                color: "#111"
              }}>
                Title *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                }}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter recipe title"
              />
            </View>

            {/* Caption */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                marginBottom: 8,
                color: "#111"
              }}>
                Caption
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                }}
                value={formData.caption}
                onChangeText={(text) => setFormData({ ...formData, caption: text })}
                placeholder="Enter a short caption"
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                marginBottom: 8,
                color: "#111"
              }}>
                Description
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                  height: 100,
                  textAlignVertical: "top",
                }}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter recipe description"
                multiline
              />
            </View>

            {/* Prep Time */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                marginBottom: 8,
                color: "#111"
              }}>
                Prep Time
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                }}
                value={formData.prep_time}
                onChangeText={(text) => setFormData({ ...formData, prep_time: text })}
                placeholder="e.g., 15 mins"
              />
            </View>

            {/* Cook Time */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                marginBottom: 8,
                color: "#111"
              }}>
                Cook Time
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                }}
                value={formData.cook_time}
                onChangeText={(text) => setFormData({ ...formData, cook_time: text })}
                placeholder="e.g., 30 mins"
              />
            </View>

            {/* Difficulty */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                marginBottom: 8,
                color: "#111"
              }}>
                Difficulty
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                }}
                value={formData.difficulty}
                onChangeText={(text) => setFormData({ ...formData, difficulty: text })}
                placeholder="e.g., Easy, Medium, Hard"
              />
            </View>

            {/* Save Button */}
            <Button
              label={saving ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
