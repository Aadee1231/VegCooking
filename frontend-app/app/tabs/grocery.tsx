import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Share,
    Text,
    TextInput,
    View
} from "react-native";

import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
} from "react-native";
import { addDays, fmtISODate, niceDate, startOfWeek } from "../../src/lib/date";
import { supabase } from "../../src/lib/supabase";
import { toast } from "../../src/lib/toast";
import { Button, Card, H1, Muted, Screen } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";


type SortMode = "aisle" | "az" | "recent" | "recipe";

type ShoppingList = {
  id: number;
  user_id: string;
  title: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
};

type ShoppingItem = {
  id: number;
  list_id: number;

  ingredient_id: number | null;
  custom_text: string | null;

  quantity: number | null;
  unit_code: string | null;

  checked: boolean;

  created_at?: string;
};

type IngredientRow = {
  id: number;
  name: string;
  norm_name?: string | null;
  emoji?: string | null;
};

type UnitRow = { code: string; name: string };

type MealPlanRow = {
  plan_date: string;
  meal: string;
  location: "home" | "outside";
  recipe_id: number | null;
};

type RecipeIngRow = {
  recipe_id: number;
  ingredient_id: number;
  quantity: number | null;
  unit_code: string | null;
  ingredient: IngredientRow | null;
};

function normalizeAisleFromName(name: string) {
  const n = name.toLowerCase();

  // Produce
  if (/(tomato|spinach|cilantro|lettuce|kale|arugula|onion|garlic|ginger|potato|carrot|pepper|broccoli|mushroom|avocado|lime|lemon|banana|apple|berry|strawberry|blueberry)/.test(n))
    return "Fresh Produce";

  // Dairy / eggs / fridge
  if (/(milk|cheese|yogurt|butter|cream|egg|eggs|sour cream|mozzarella|cheddar|parmesan)/.test(n))
    return "Dairy, Eggs & Fridge";

  // Bakery
  if (/(bread|bun|bagel|tortilla|wrap|pita|naan|croissant)/.test(n))
    return "Bakery";

  // Oils & vinegars
  if (/(oil|olive oil|vegetable oil|canola|vinegar|balsamic|rice vinegar)/.test(n))
    return "Oils & Vinegars";

  // Spices / seasonings
  if (/(salt|pepper|paprika|cumin|coriander|turmeric|chili|cayenne|oregano|basil|thyme|rosemary|garam|masala|spice)/.test(n))
    return "Spices & Seasonings";

  // Pasta / grains / legumes
  if (/(pasta|noodle|rice|quinoa|lentil|beans|bean|chickpea|flour|bread flour|oat|oats)/.test(n))
    return "Pasta, Grains & Legumes";

  // Frozen
  if (/(frozen)/.test(n)) return "Frozen";

  // Pantry catch-all
  return "Pantry";
}

function displayNameForItem(item: ShoppingItem, ingredientsById: Record<number, IngredientRow>) {
  if (item.ingredient_id) return ingredientsById[item.ingredient_id]?.name ?? "Unknown ingredient";
  return item.custom_text ?? "Custom item";
}

function displayEmojiForItem(item: ShoppingItem, ingredientsById: Record<number, IngredientRow>) {
  if (item.ingredient_id) return ingredientsById[item.ingredient_id]?.emoji ?? "🧺";
  return "📝";
}

function fmtQty(q: number | null | undefined) {
  if (q === null || q === undefined) return "";
  // Avoid 2.000000
  if (Math.abs(q - Math.round(q)) < 1e-9) return String(Math.round(q));
  return String(Number(q.toFixed(2)));
}

export default function GroceryScreen() {
  const params = useLocalSearchParams();
  const weekParam = typeof params.week === "string" ? params.week : null;

  // weekStart based on param (Option A), otherwise defaults to this week
  const weekStartDate = useMemo(() => {
    if (weekParam) return new Date(weekParam + "T00:00:00");
    return startOfWeek(new Date());
  }, [weekParam]);

  const weekStartIso = useMemo(() => fmtISODate(startOfWeek(weekStartDate)), [weekStartDate]);
  const weekEndIso = useMemo(() => fmtISODate(addDays(new Date(weekStartIso + "T00:00:00"), 6)), [weekStartIso]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [list, setList] = useState<ShoppingList | null>(null);

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [ingredientsById, setIngredientsById] = useState<Record<number, IngredientRow>>({});
  const [unitsByCode, setUnitsByCode] = useState<Record<string, UnitRow>>({});

  const [sortMode, setSortMode] = useState<SortMode>("aisle");
  const [sortOpen, setSortOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // add item modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addUnit, setAddUnit] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        toast("Please sign in first.");
        router.replace("/auth");
        return;
      }

      await bootstrap(uid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartIso]);

  async function bootstrap(uid: string) {
    setLoading(true);
    try {
      // 1) Get or create shopping list for this user + week
      const listRow = await getOrCreateShoppingList(uid, weekStartIso, weekEndIso);
      setList(listRow);

      // 2) Load units table (small)
      await loadUnits();

      // 3) Sync items from meal plans (auto-ingredients), then load items
      await syncFromMealPlans(uid, listRow.id, weekStartIso, weekEndIso);

      // 4) Load final items
      await loadListItems(listRow.id);
    } catch (e: any) {
      console.error(e);
      toast(e?.message ?? "Failed to load grocery list");
    } finally {
      setLoading(false);
    }
  }

  async function getOrCreateShoppingList(uid: string, start: string, end: string): Promise<ShoppingList> {
    // Try find existing
    const { data: existing, error: exErr } = await supabase
      .from("shopping_lists")
      .select("id,user_id,title,start_date,end_date")
      .eq("user_id", uid)
      .eq("start_date", start)
      .eq("end_date", end)
      .maybeSingle();

    if (exErr) throw exErr;
    if (existing) return existing as any;

    // Create new list
    const title = `Grocery List • ${start}`;
    const { data: created, error: cErr } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: uid,
        title,
        start_date: start,
        end_date: end,
        status: "active", // if your enum differs, remove this line
      })
      .select("id,user_id,title,start_date,end_date")
      .single();

    // If status enum doesn't exist or differs, Supabase will throw; we’ll retry without it.
    if (cErr) {
      // Retry without status for safety
      const { data: created2, error: cErr2 } = await supabase
        .from("shopping_lists")
        .insert({
          user_id: uid,
          title,
          start_date: start,
          end_date: end,
        })
        .select("id,user_id,title,start_date,end_date")
        .single();

      if (cErr2) throw cErr2;
      return created2 as any;
    }

    return created as any;
  }

  async function loadUnits() {
    const { data, error } = await supabase.from("units").select("code,name");
    if (error) {
      console.error("units load error:", error);
      return;
    }
    const map: Record<string, UnitRow> = {};
    (data ?? []).forEach((u: any) => (map[u.code] = u));
    setUnitsByCode(map);
  }

  async function loadListItems(listId: number) {
    const { data, error } = await supabase
      .from("shopping_list_items")
      .select("id,list_id,ingredient_id,custom_text,quantity,unit_code,checked,created_at")
      .eq("list_id", listId)
      .order("id", { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as any[];

    // Build ingredient lookup for emoji/name if ingredient_id exists
    const ingIds = Array.from(new Set(rows.map((r) => r.ingredient_id).filter(Boolean))) as number[];
    if (ingIds.length) {
      const { data: ings, error: iErr } = await supabase
        .from("ingredients")
        .select("id,name,norm_name,emoji")
        .in("id", ingIds);

      if (!iErr) {
        const map: Record<number, IngredientRow> = {};
        (ings ?? []).forEach((x: any) => (map[x.id] = x));
        setIngredientsById(map);
      }
    }

    setItems(rows as any);
  }

  async function syncFromMealPlans(uid: string, listId: number, start: string, end: string) {
    setSyncing(true);
    try {
      // 1) Pull this week’s planned home recipes
      const { data: plans, error: pErr } = await supabase
        .from("meal_plans")
        .select("plan_date,meal,location,recipe_id")
        .gte("plan_date", start)
        .lte("plan_date", end)
        .eq("location", "home")
        .not("recipe_id", "is", null);

      if (pErr) throw pErr;

      const recipeIds = Array.from(new Set((plans ?? []).map((p: any) => p.recipe_id).filter(Boolean))) as number[];
      if (!recipeIds.length) {
        // If nothing planned, remove auto-items (ingredient-based) that are not checked.
        await pruneAutoItemsNotInSet(listId, new Set<string>());
        return;
      }

      // 2) Fetch recipe ingredients joined with ingredient rows
      const { data: ris, error: rErr } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id,ingredient_id,quantity,unit_code, ingredient:ingredients(id,name,norm_name,emoji)")
        .in("recipe_id", recipeIds);

      if (rErr) throw rErr;

      const rows = (ris ?? []) as any as RecipeIngRow[];

      // 3) Aggregate: key = ingredient_id + unit_code
      const agg = new Map<string, { ingredient_id: number; unit_code: string | null; quantity: number; ingredient: IngredientRow }>();
      const ingredientMap: Record<number, IngredientRow> = {};
      rows.forEach((r) => {
        if (!r.ingredient_id || !r.ingredient) return;

        ingredientMap[r.ingredient_id] = r.ingredient;

        const unit = r.unit_code ?? null;
        const key = `${r.ingredient_id}__${unit ?? "null"}`;
        const qty = r.quantity ?? 0;

        if (!agg.has(key)) {
          agg.set(key, {
            ingredient_id: r.ingredient_id,
            unit_code: unit,
            quantity: qty,
            ingredient: r.ingredient,
          });
        } else {
          const prev = agg.get(key)!;
          prev.quantity += qty;
        }
      });

      setIngredientsById((prev) => ({ ...prev, ...ingredientMap }));

      const desiredKeys = new Set<string>(Array.from(agg.keys()));

      // 4) Load existing list items for this list
      const { data: existingItems, error: eErr } = await supabase
        .from("shopping_list_items")
        .select("id,list_id,ingredient_id,custom_text,quantity,unit_code,checked")
        .eq("list_id", listId);

      if (eErr) throw eErr;

      const existing = (existingItems ?? []) as any as ShoppingItem[];

      // Index existing auto-items by same key
      const existingAutoByKey = new Map<string, ShoppingItem>();
      existing.forEach((it) => {
        if (!it.ingredient_id) return; // skip custom items
        const key = `${it.ingredient_id}__${it.unit_code ?? "null"}`;
        existingAutoByKey.set(key, it);
      });

      // 5) Upsert all desired items:
      // - If exists: update quantity but preserve checked
      // - If missing: insert
      const inserts: any[] = [];
      const updates: { id: number; patch: any }[] = [];

      agg.forEach((v, key) => {
        const found = existingAutoByKey.get(key);
        if (!found) {
          inserts.push({
            list_id: listId,
            ingredient_id: v.ingredient_id,
            custom_text: null,
            quantity: v.quantity,
            unit_code: v.unit_code,
            checked: false,
          });
        } else {
          const currentQty = found.quantity ?? 0;
          if (Math.abs(currentQty - v.quantity) > 1e-9) {
            updates.push({
              id: found.id,
              patch: { quantity: v.quantity },
            });
          }
        }
      });

      if (inserts.length) {
        const { error: insErr } = await supabase.from("shopping_list_items").insert(inserts);
        if (insErr) throw insErr;
      }

      for (const u of updates) {
        const { error: upErr } = await supabase
          .from("shopping_list_items")
          .update(u.patch)
          .eq("id", u.id);
        if (upErr) throw upErr;
      }

      // 6) Prune auto-items that are no longer needed (ingredient-based only).
      await pruneAutoItemsNotInSet(listId, desiredKeys);

    } finally {
      setSyncing(false);
    }
  }

  async function pruneAutoItemsNotInSet(listId: number, desiredKeys: Set<string>) {
    // Delete ingredient-based items not in desiredKeys AND not checked.
    const { data, error } = await supabase
      .from("shopping_list_items")
      .select("id,ingredient_id,unit_code,checked,custom_text")
      .eq("list_id", listId);

    if (error) throw error;

    const rows = (data ?? []) as any as ShoppingItem[];
    const toDelete = rows
      .filter((it) => it.ingredient_id && !it.custom_text) // auto-items
      .filter((it) => !it.checked)
      .filter((it) => {
        const key = `${it.ingredient_id}__${it.unit_code ?? "null"}`;
        return !desiredKeys.has(key);
      })
      .map((it) => it.id);

    if (!toDelete.length) return;

    const { error: delErr } = await supabase.from("shopping_list_items").delete().in("id", toDelete);
    if (delErr) throw delErr;
  }

  async function toggleChecked(item: ShoppingItem) {
    const next = !item.checked;
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked: next } : x)));

    const { error } = await supabase.from("shopping_list_items").update({ checked: next }).eq("id", item.id);
    if (error) {
      console.error(error);
      toast("Failed to update item");
      // revert
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked: !next } : x)));
    }
  }

  async function clearChecked() {
    if (!list) return;
    Alert.alert("Clear checked items?", "This will remove all checked items from this week’s list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
          if (!checkedIds.length) return;

          const { error } = await supabase.from("shopping_list_items").delete().in("id", checkedIds);
          if (error) {
            console.error(error);
            toast("Failed to clear checked");
            return;
          }

          setItems((prev) => prev.filter((i) => !i.checked));
        },
      },
    ]);
  }

  async function addCustomItem() {
    if (!list) return;

    const name = addName.trim();
    if (!name) {
      toast("Enter an item name");
      return;
    }

    const qty = addQty.trim() ? Number(addQty.trim()) : null;
    const unit = addUnit.trim() ? addUnit.trim() : null;

    if (addQty.trim() && Number.isNaN(qty)) {
      toast("Quantity must be a number (ex: 2, 1.5)");
      return;
    }

    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({
        list_id: list.id,
        ingredient_id: null,
        custom_text: name,
        quantity: qty,
        unit_code: unit,
        checked: false,
      })
      .select("id,list_id,ingredient_id,custom_text,quantity,unit_code,checked,created_at")
      .single();

    if (error) {
      console.error(error);
      toast("Failed to add item");
      return;
    }

    setItems((prev) => [...prev, data as any]);
    setAddOpen(false);
    setAddName("");
    setAddQty("");
    setAddUnit("");
  }

  const unchecked = useMemo(() => items.filter((i) => !i.checked), [items]);
  const checked = useMemo(() => items.filter((i) => i.checked), [items]);

  const sortedUnchecked = useMemo(() => {
    const arr = [...unchecked];

    const getName = (it: ShoppingItem) => displayNameForItem(it, ingredientsById).toLowerCase();
    const getAisle = (it: ShoppingItem) => normalizeAisleFromName(displayNameForItem(it, ingredientsById));

    if (sortMode === "az") arr.sort((a, b) => getName(a).localeCompare(getName(b)));
    if (sortMode === "recent")
        arr.sort((a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
    );
    if (sortMode === "aisle") arr.sort((a, b) => getAisle(a).localeCompare(getAisle(b)) || getName(a).localeCompare(getName(b)));
    if (sortMode === "recipe") {
        // Best approximation for aggregated data:
        // group by aisle, then by name
        arr.sort((a, b) => {
            const aisleCmp = getAisle(a).localeCompare(getAisle(b));
            if (aisleCmp !== 0) return aisleCmp;
            return getName(a).localeCompare(getName(b));
        });
    }

    return arr;
  }, [unchecked, sortMode, ingredientsById]);

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    sortedUnchecked.forEach((it) => {
      const aisle = normalizeAisleFromName(displayNameForItem(it, ingredientsById));
      if (!map.has(aisle)) map.set(aisle, []);
      map.get(aisle)!.push(it);
    });
    return Array.from(map.entries());
  }, [sortedUnchecked, ingredientsById]);

  async function onShare() {
    const lines: string[] = [];
    lines.push(`Here's my Flavur grocery list:`);
    lines.push("");
    lines.push(`${niceDate(new Date(weekStartIso + "T00:00:00"))} – ${niceDate(new Date(weekEndIso + "T00:00:00"))}`);
    lines.push("");

    // Group by aisle for share (always aisle format, like ReciMe)
    grouped.forEach(([aisle, items]) => {
      lines.push(`# ${aisle}`);
      items.forEach((it) => {
        const name = displayNameForItem(it, ingredientsById);
        const qty = fmtQty(it.quantity);
        const unit = it.unit_code ? it.unit_code : "";
        const qtyPart = qty ? `${qty}${unit ? " " + unit : ""} ` : "";
        lines.push(`- ${qtyPart}${name}`);
      });
      lines.push("");
    });

    if (checked.length) {
      lines.push(`# Checked items`);
      checked.forEach((it) => {
        const name = displayNameForItem(it, ingredientsById);
        const qty = fmtQty(it.quantity);
        const unit = it.unit_code ? it.unit_code : "";
        const qtyPart = qty ? `${qty}${unit ? " " + unit : ""} ` : "";
        lines.push(`- ${qtyPart}${name}`);
      });
      lines.push("");
    }

    lines.push("Download Flavur ❤️");

    try {
      await Share.share({ message: lines.join("\n") });
    } catch (e) {
      console.error(e);
      toast("Share failed");
    }
  }

  function openOrderOnline() {
    Alert.alert("Coming Soon", "Online grocery ordering is coming soon in Flavur.");
  }

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: theme.colors.subtext }}>Loading grocery list…</Text>
        </View>
      </Screen>
    );
  }

  const itemCount = unchecked.length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing(7) }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: theme.spacing(2), paddingTop: theme.spacing(2) }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <H1>Grocery List</H1>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* Add */}
              <Pressable
                onPress={() => setAddOpen(true)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </Pressable>

              {/* Share */}
              <Pressable
                onPress={onShare}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons name="share-outline" size={18} color={theme.colors.text} />
              </Pressable>

              {/* More */}
              <Pressable
                onPress={() => setMoreOpen(true)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>

          <Muted style={{ marginTop: 6 }}>
            {niceDate(new Date(weekStartIso + "T00:00:00"))} – {niceDate(new Date(weekEndIso + "T00:00:00"))}
          </Muted>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <Text style={{ color: theme.colors.subtext, fontWeight: "800" }}>{itemCount} items</Text>

            <Pressable
              onPress={() => setSortOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: "#fff",
              }}
            >
              <Ionicons name="swap-vertical" size={16} color={theme.colors.subtext} />
              <Text style={{ fontWeight: "900", color: theme.colors.text }}>
                {sortMode === "aisle" ? "Aisle" : sortMode === "az" ? "A to Z" : sortMode === "recent" ? "Recently added" : "Recipe"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.subtext} />
            </Pressable>
          </View>

          <View style={{ marginTop: 12 }}>
            <Pressable
              onPress={openOrderOnline}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="cart-outline" size={18} color={theme.colors.green ?? "#2e7d32"} />
              <Text style={{ fontWeight: "900", color: theme.colors.text }}>Order online</Text>
              <Text style={{ color: theme.colors.subtext, marginLeft: 6 }}>(Coming soon)</Text>
            </Pressable>
          </View>

          {/* Sync button */}
          <View style={{ marginTop: 12 }}>
            <Button
              label={syncing ? "Syncing…" : "Sync from Meal Plan"}
              onPress={async () => {
                if (!userId || !list) return;
                await syncFromMealPlans(userId, list.id, weekStartIso, weekEndIso);
                await loadListItems(list.id);
                toast("Grocery list updated!");
              }}
              disabled={syncing}
            />
          </View>
        </View>

        {/* List */}
        <View style={{ paddingHorizontal: theme.spacing(2), marginTop: theme.spacing(2), gap: 12 }}>
          {grouped.length === 0 ? (
            <Card style={{ padding: theme.spacing(2) }}>
              <Text style={{ fontWeight: "900" }}>No groceries for this week yet.</Text>
              <Muted style={{ marginTop: 6 }}>
                Add recipes to this week in Meal Planner, then tap “Sync from Meal Plan”.
              </Muted>
            </Card>
          ) : (
            grouped.map(([aisle, aisleItems]) => (
              <View key={aisle} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: "900", color: theme.colors.subtext, letterSpacing: 1 }}>
                  {aisle.toUpperCase()}
                </Text>

                <Card style={{ marginTop: 10, paddingVertical: 4 }}>
                  {aisleItems.map((it) => {
                    const name = displayNameForItem(it, ingredientsById);
                    const emoji = displayEmojiForItem(it, ingredientsById);
                    const qty = fmtQty(it.quantity);
                    const unit = it.unit_code ? it.unit_code : "";

                    return (
                      <Pressable
                        key={it.id}
                        onPress={() => toggleChecked(it)}
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <Text style={{ fontSize: 18 }}>{emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: "800", color: theme.colors.text }} numberOfLines={1}>
                              {name}
                            </Text>

                            {(qty || unit) ? (
                              <Text style={{ marginTop: 3, color: theme.colors.subtext, fontSize: 12 }}>
                                {qty ? qty : ""}{qty && unit ? " " : ""}{unit ? unit : ""}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            borderWidth: 2,
                            borderColor: it.checked ? (theme.colors.green ?? "#2e7d32") : theme.colors.border,
                            backgroundColor: it.checked ? (theme.colors.green ?? "#2e7d32") : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {it.checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            ))
          )}

          {/* Checked items section */}
          {checked.length ? (
            <View style={{ marginTop: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "900", color: theme.colors.subtext }}>Checked items</Text>
                <Pressable onPress={clearChecked}>
                  <Text style={{ fontWeight: "900", color: theme.colors.green ?? "#2e7d32" }}>Clear all</Text>
                </Pressable>
              </View>

              <Card style={{ marginTop: 10, paddingVertical: 4 }}>
                {checked.map((it) => {
                  const name = displayNameForItem(it, ingredientsById);
                  const emoji = displayEmojiForItem(it, ingredientsById);
                  const qty = fmtQty(it.quantity);
                  const unit = it.unit_code ? it.unit_code : "";

                  return (
                    <Pressable
                      key={it.id}
                      onPress={() => toggleChecked(it)}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        opacity: 0.6,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "800", color: theme.colors.text, textDecorationLine: "line-through" }} numberOfLines={1}>
                            {name}
                          </Text>
                          {(qty || unit) ? (
                            <Text style={{ marginTop: 3, color: theme.colors.subtext, fontSize: 12 }}>
                              {qty ? qty : ""}{qty && unit ? " " : ""}{unit ? unit : ""}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: theme.colors.green ?? "#2e7d32",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* SORT MODAL */}
      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable onPress={() => setSortOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
            <Text style={{ fontWeight: "900", fontSize: 18, textAlign: "center" }}>Sort by</Text>

            {[
              { key: "recipe", label: "Recipe" },
              { key: "aisle", label: "Aisle" },
              { key: "az", label: "A to Z" },
              { key: "recent", label: "Recently added" },
            ].map((o) => {
              const active = sortMode === (o.key as SortMode);
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    setSortMode(o.key as SortMode);
                    setSortOpen(false);
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: active ? "900" : "700" }}>{o.label}</Text>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: active ? (theme.colors.green ?? "#2e7d32") : theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active ? (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.green ?? "#2e7d32" }} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* MORE MODAL */}
      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable onPress={() => setMoreOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
            <Pressable
              onPress={() => {
                setMoreOpen(false);
                onShare();
              }}
              style={{ paddingVertical: 14 }}
            >
              <Text style={{ fontWeight: "900", fontSize: 16, textAlign: "center" }}>Share items in list</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMoreOpen(false);
                clearChecked();
              }}
              style={{ paddingVertical: 14 }}
            >
              <Text style={{ fontWeight: "900", fontSize: 16, textAlign: "center", color: "#c62828" }}>
                Clear checked items
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ADD ITEM MODAL */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
                style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.25)",
                justifyContent: "flex-end",
                }}
            >
                <TouchableWithoutFeedback>
                <View
                    style={{
                    backgroundColor: "#fff",
                    padding: 18,
                    paddingBottom: 28,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    }}
                >
                    <Text style={{ fontWeight: "900", fontSize: 18, textAlign: "center" }}>
                    Add item
                    </Text>

                    <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{ marginTop: 14 }}
                    >
                    <View style={{ gap: 12 }}>
                        <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <TextInput
                            value={addName}
                            onChangeText={setAddName}
                            placeholder="Item name (ex: bananas)"
                            placeholderTextColor={theme.colors.subtext}
                            style={{ fontSize: 15 }}
                            autoFocus
                        />
                        </View>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <TextInput
                            value={addQty}
                            onChangeText={setAddQty}
                            placeholder="Qty (ex: 2)"
                            keyboardType="decimal-pad"
                            placeholderTextColor={theme.colors.subtext}
                            style={{ fontSize: 15 }}
                            />
                        </View>

                        <View style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <TextInput
                            value={addUnit}
                            onChangeText={setAddUnit}
                            placeholder="Unit (ex: pc, tsp)"
                            placeholderTextColor={theme.colors.subtext}
                            style={{ fontSize: 15 }}
                            />
                        </View>
                        </View>

                        <Button label="Add" onPress={addCustomItem} />
                    </View>
                    </ScrollView>
                </View>
                </TouchableWithoutFeedback>
            </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
