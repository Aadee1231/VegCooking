import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { addDays, fmtISODate, niceDate, startOfWeek } from "../../src/lib/date";
import { resolveImageUrl } from "../../src/lib/images";
import { supabase } from "../../src/lib/supabase";
import { toast } from "../../src/lib/toast";
import { PickableRecipe, RecipePickerSheet } from "../../src/mealplan/RecipePickerSheet";
import { Button, Card, Chip, H1, H3, Muted, Screen } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";


type Meal = "breakfast" | "lunch" | "dinner" | "snack";
const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

type PlanRow = {
  id: number;
  plan_date: string;
  meal: Meal;
  location: "home" | "outside";
  recipe_id: number | null;
  external_name: string | null;
};

type RecipeMini = {
  id: number;
  title: string;
  image_url: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  difficulty?: string | null;
};

function mealLabel(m: Meal) {
  if (m === "breakfast") return "Breakfast";
  if (m === "lunch") return "Lunch";
  if (m === "dinner") return "Dinner";
  return "Snack";
}
function mealIcon(m: Meal) {
  if (m === "breakfast") return "cafe-outline";
  if (m === "lunch") return "restaurant-outline";
  if (m === "dinner") return "moon-outline";
  return "nutrition-outline";
}


export default function MealPlanScreen() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<Record<string, string>>({});

  // NEW: recipe picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  const [activeDate, setActiveDate] = useState<Date | null>(null);

  // NEW: cache recipe metadata by id (so we can display title/image/cook time)
  const [recipeMap, setRecipeMap] = useState<Record<number, RecipeMini>>({});

  const router = useRouter();


  useEffect(() => {
    // when week changes, default selection to today if it's in this week
    const todayIso = fmtISODate(new Date());
    const idx = days.findIndex((d) => fmtISODate(d) === todayIso);
    setSelectedDayIdx(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      const from = fmtISODate(days[0]);
      const to = fmtISODate(days[6]);

      const { data: rows, error } = await supabase
        .from("meal_plans")
        .select("*")
        .gte("plan_date", from)
        .lte("plan_date", to);

      if (!alive) return;

      if (error) {
        console.error(error);
        setPlans([]);
      } else {
        setPlans((rows ?? []) as any);
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [weekStart, days]);

  // NEW: fetch recipe metadata for recipes used in this week
  useEffect(() => {
    const ids = Array.from(new Set(plans.map((p) => p.recipe_id).filter(Boolean))) as number[];
    if (!ids.length) return;

    // Only fetch ids we don't already have
    const missing = ids.filter((id) => !recipeMap[id]);
    if (!missing.length) return;

    (async () => {
      const { data, error } = await supabase
        .from("public_recipes_with_stats")
        .select("id,title,image_url,prep_time,cook_time,difficulty")
        .in("id", missing);

      if (error) {
        console.error("recipe meta fetch error:", error);
        return;
      }

      const map: Record<number, RecipeMini> = {};
      (data ?? []).forEach((r: any) => (map[r.id] = r));
      setRecipeMap((prev) => ({ ...prev, ...map }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  function prevWeek() {
    setWeekStart(addDays(weekStart, -7));
  }
  function nextWeek() {
    setWeekStart(addDays(weekStart, 7));
  }
  function resetToday() {
    setWeekStart(startOfWeek(new Date()));
  }

  function getCell(date: Date, meal: Meal) {
    const iso = fmtISODate(date);
    return plans.find((p) => p.plan_date === iso && p.meal === meal) || null;
  }

  async function requireUser() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    if (!uid) throw new Error("Please sign in first.");
    return uid;
  }

  async function upsertCell(date: Date, meal: Meal, patch: Partial<PlanRow>) {
    const iso = fmtISODate(date);
    const key = `${iso}-${meal}`;
    setSavingKey(key);

    try {
      await requireUser();

      const existing = plans.find((p) => p.plan_date === iso && p.meal === meal);

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from("meal_plans")
          .insert({
            plan_date: iso,
            meal,
            location: patch.location ?? "home",
            recipe_id: patch.recipe_id ?? null,
            external_name: patch.external_name ?? null,
            note: null,
          })
          .select("*")
          .single();

        if (error) throw error;
        setPlans((prev) => [...prev, inserted as any]);
      } else {
        const { data: updated, error } = await supabase
          .from("meal_plans")
          .update({
            location: patch.location ?? existing.location,
            recipe_id:
              Object.prototype.hasOwnProperty.call(patch, "recipe_id")
                ? patch.recipe_id ?? null
                : existing.recipe_id,
            external_name:
              Object.prototype.hasOwnProperty.call(patch, "external_name")
                ? patch.external_name ?? null
                : existing.external_name,
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) throw error;

        setPlans((prev) => prev.map((p) => (p.id === existing.id ? (updated as any) : p)));
      }
    } catch (e: any) {
      toast(e.message ?? "Save failed");
    } finally {
      setSavingKey(null);
    }
  }

  async function clearCell(date: Date, meal: Meal) {
    const cell = getCell(date, meal);
    if (!cell) return;

    const key = `${fmtISODate(date)}-${meal}`;
    setSavingKey(key);

    try {
      await requireUser();
      await supabase.from("meal_plans").delete().eq("id", cell.id);
      setPlans((prev) => prev.filter((p) => p.id !== cell.id));
    } catch (e: any) {
      toast(e.message ?? "Delete failed");
    } finally {
      setSavingKey(null);
    }
  }

  // NEW: open picker helper
  function openPicker(date: Date, meal: Meal) {
    setActiveDate(date);
    setActiveMeal(meal);
    setPickerOpen(true);
  }

  // NEW: selection handler
  async function onPickRecipe(recipe: PickableRecipe) {
    if (!activeDate || !activeMeal) return;

    // cache it immediately for UI (no waiting on refetch)
    setRecipeMap((prev) => ({
      ...prev,
      [recipe.id]: {
        id: recipe.id,
        title: recipe.title,
        image_url: recipe.image_url ?? null,
        cook_time: recipe.cook_time ?? null,
        prep_time: recipe.prep_time ?? null,
        difficulty: recipe.difficulty ?? null,
      },
    }));

    await upsertCell(activeDate, activeMeal, {
      location: "home",
      recipe_id: recipe.id,
      external_name: null,
    });

    setPickerOpen(false);
  }

  const day = days[selectedDayIdx];

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen>
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing(6) }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: theme.spacing(2),
              paddingTop: theme.spacing(2),
              alignItems: "center",
            }}
          >
            <H1 style={{ textAlign: "center" }}>Meal Planner</H1>

            <Muted style={{ marginTop: 6, textAlign: "center" }}>
              {niceDate(days[0])} – {niceDate(days[6])}
            </Muted>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: theme.spacing(2),
              }}
            >
              <Chip label="Prev" onPress={prevWeek} />
              <Chip label="This Week" onPress={resetToday} />
              <Chip label="Next" onPress={nextWeek} />
            </View>

            <View style={{ marginTop: 12, width: "100%", paddingHorizontal: theme.spacing(2) }}>
              <Button
                label="Grocery List"
                onPress={() => {
                  // Option A: grocery list reflects the currently viewed week
                  const weekIso = fmtISODate(days[0]); // start of this visible week
                  router.push(`/tabs/grocery?week=${weekIso}`);
                }}
              />
            </View>

          </View>


          {/* Day selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: theme.spacing(2) }}
            contentContainerStyle={{ paddingHorizontal: theme.spacing(2), gap: 10 }}
          >
            {days.map((d, idx) => {
              const isToday = fmtISODate(d) === fmtISODate(new Date());
              const active = idx === selectedDayIdx;
              const label = new Date(d).toLocaleDateString(undefined, { weekday: "short" });

              return (
                <Chip
                  key={d.toISOString()}
                  label={isToday ? `${label} • Today` : label}
                  active={active}
                  onPress={() => setSelectedDayIdx(idx)}
                />
              );
            })}
          </ScrollView>

          {/* Selected day title */}
          <View style={{ paddingHorizontal: theme.spacing(2), marginTop: theme.spacing(2) }}>
            <H3>{niceDate(day)}</H3>
            <Muted style={{ marginTop: 4 }}>
              Pick Home/Outside. For Home meals, tap the recipe box to choose a recipe.
            </Muted>
          </View>

          {/* Meals list */}
          <View style={{ paddingHorizontal: theme.spacing(2), marginTop: theme.spacing(2), gap: 12 }}>
            {MEALS.map((meal) => {
              const cell = getCell(day, meal);
              const key = `${fmtISODate(day)}-${meal}`;
              const busy = savingKey === key;

              const isOutside = (cell?.location ?? "home") === "outside";
              const outsideText = editingText[key] ?? cell?.external_name ?? "";

              const selectedRecipe = cell?.recipe_id ? recipeMap[cell.recipe_id] : null;
              const selectedRecipeImg = selectedRecipe ? resolveImageUrl("recipe-media", selectedRecipe.image_url) : null;

              return (
                <Card key={meal} style={{ padding: theme.spacing(2) }}>
                  <Pressable
                    onPress={() => {
                      if (isOutside) return;

                      if (selectedRecipe) {
                        router.push(`/recipe/${selectedRecipe.id}`);
                      } else {
                        openPicker(day, meal);
                      }
                    }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: theme.colors.chip,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name={mealIcon(meal) as any} size={20} color={theme.colors.text} />
                      </View>
                      <View>
                        <H3 style={{ fontSize: 17 }}>{mealLabel(meal)}</H3>
                        {!cell ? (
                          <Muted style={{ marginTop: 2 }}>Not planned yet</Muted>
                        ) : isOutside ? (
                          <Muted style={{ marginTop: 2 }}>Outside</Muted>
                        ) : (
                          <Muted style={{ marginTop: 2 }}>Home</Muted>
                        )}
                      </View>

                      {/* text */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: theme.colors.text }} numberOfLines={1}>
                          {selectedRecipe?.title ?? "Tap to choose recipe"}
                        </Text>

                        {selectedRecipe ? (
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                            {selectedRecipe.prep_time ? (
                              <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                ⏱ {selectedRecipe.prep_time}
                              </Text>
                            ) : null}
                            {selectedRecipe.cook_time ? (
                              <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                🔥 {selectedRecipe.cook_time}
                              </Text>
                            ) : null}
                            {selectedRecipe.difficulty ? (
                              <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                ⚙️ {selectedRecipe.difficulty}
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <Muted style={{ marginTop: 6 }}>Opens the recipe picker</Muted>
                        )}
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={theme.colors.subtext} />
                    </View>
                  </Pressable>

                  {/* Outside meal input */}
                  {isOutside && (
                    <View style={{ marginTop: 12 }}>
                      <TextInput
                        value={outsideText}
                        placeholder="Restaurant or food (e.g. Chipotle, Pizza)"
                        placeholderTextColor={theme.colors.subtext}
                        onChangeText={(txt) => {
                          setEditingText((prev) => ({ ...prev, [key]: txt }));
                        }}
                        onBlur={() =>
                          upsertCell(day, meal, {
                            location: "outside",
                            external_name: outsideText,
                            recipe_id: null,
                          })
                        }
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 12,
                          padding: 10,
                          backgroundColor: "white",
                          color: theme.colors.text,
                        }}
                      />
                    </View>
                  )}

                  {/* Actions */}
                  <View style={{ flexDirection: "row", gap: 10, marginTop: theme.spacing(2) }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Home"
                        variant={isOutside ? "ghost" : "primary"}
                        onPress={() => {
                          // Switch to home. If there's no recipe, open picker immediately (premium feel).
                          upsertCell(day, meal, { location: "home", external_name: null });
                          openPicker(day, meal);
                        }}
                        disabled={busy}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Outside"
                        variant={isOutside ? "primary" : "ghost"}
                        onPress={() =>
                          upsertCell(day, meal, { location: "outside", external_name: outsideText || "", recipe_id: null })
                        }
                        disabled={busy}
                      />
                    </View>
                    <View style={{ width: 92 }}>
                      <Button
                        label="Clear"
                        variant="danger"
                        onPress={() => clearCell(day, meal)}
                        disabled={!cell || busy}
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </Screen>
      {/* NEW: Recipe Picker Bottom Sheet */}
      <RecipePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickRecipe}
        title="Pick a Recipe"
      />
    </>
  );
}
