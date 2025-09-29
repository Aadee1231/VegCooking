import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { startOfWeek, addDays, fmtISODate, niceDate } from "../lib/date";
import SearchableRecipeSelect, { type RecipeOpt } from "../components/SearchableRecipeSelect";

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

export default function MealPlanPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeOpt[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid);

      const from = fmtISODate(days[0]);
      const to = fmtISODate(days[6]);

      // meal_plans for this week
      const { data: rows } = await supabase
        .from("meal_plans")
        .select("*")
        .gte("plan_date", from)
        .lte("plan_date", to);
      setPlans((rows ?? []) as any);

      // recipes you can see (yours + public)
      const { data: recs } = await supabase
        .from("recipes")
        .select("id,title,user_id,is_public")
        .or(
          `is_public.eq.true,user_id.eq.${
            uid || "00000000-0000-0000-0000-000000000000"
          }`
        )
        .order("created_at", { ascending: false })
        .limit(500);
      setRecipes((recs ?? []) as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

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

  async function saveCell(date: Date, meal: Meal, data: Partial<PlanRow>) {
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
            location: data.location ?? "home",
            recipe_id: data.recipe_id ?? null,
            external_name: data.external_name ?? null,
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
            location: data.location ?? existing.location,
            recipe_id: Object.prototype.hasOwnProperty.call(data, "recipe_id")
              ? data.recipe_id!
              : existing.recipe_id,
            external_name: Object.prototype.hasOwnProperty.call(
              data,
              "external_name"
            )
              ? data.external_name ?? null
              : existing.external_name,
          })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        setPlans((prev) => prev.map((p) => (p.id === existing.id ? (updated as any) : p)));
      }
    } catch (e: any) {
      alert(e.message ?? "Save failed");
    } finally {
      setSavingKey(null);
    }
  }

  async function clearCell(date: Date, meal: Meal) {
    const c = getCell(date, meal);
    if (!c) return;
    setSavingKey(`${fmtISODate(date)}-${meal}`);
    try {
      await requireUser();
      await supabase.from("meal_plans").delete().eq("id", c.id);
      setPlans((prev) => prev.filter((p) => p.id !== c.id));
    } catch (e: any) {
      alert(e.message ?? "Delete failed");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>Meal Plan</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={prevWeek}>← Prev</button>
        <button onClick={resetToday}>This Week</button>
        <button onClick={nextWeek}>Next →</button>
        <strong style={{ marginLeft: 8 }}>
          {niceDate(days[0])} – {niceDate(days[6])}
        </strong>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 8, width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Meal / Day</th>
              {days.map((d) => (
                <th key={d.toISOString()} style={{ textAlign: "left" }}>
                  {niceDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEALS.map((meal) => (
              <tr key={meal}>
                <th style={{ textTransform: "capitalize" }}>{meal}</th>
                {days.map((d) => {
                  const cell = getCell(d, meal);
                  const key = `${fmtISODate(d)}-${meal}`;
                  const busy = savingKey === key;
                  return (
                    <td
                      key={key}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        padding: 8,
                        minWidth: 260,
                        verticalAlign: "top",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span>Location:</span>
                          <select
                            value={cell?.location ?? "home"}
                            onChange={(e) => {
                              const loc = e.target.value as "home" | "outside";
                              saveCell(d, meal, {
                                location: loc,
                                recipe_id: loc === "outside" ? null : (cell?.recipe_id ?? null),
                                external_name: loc === "outside" ? (cell?.external_name ?? "") : null,
                              });
                            }}
                            disabled={busy}
                          >
                            <option value="home">Home</option>
                            <option value="outside">Outside</option>
                          </select>
                        </label>

                        {(cell?.location ?? "home") === "home" ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: 0.7 }}>Recipe</span>
                            <SearchableRecipeSelect
                              value={cell?.recipe_id ?? null}
                              onChange={(rid) =>
                                saveCell(d, meal, {
                                  recipe_id: rid,
                                  external_name: null,
                                  location: "home",
                                })
                              }
                              options={recipes}
                              currentUserId={userId}
                              placeholder="(choose recipe)"
                              disabled={busy}
                            />
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: 0.7 }}>Outside label</span>
                            <input
                              placeholder="e.g. Chipotle, Sushi w/ Sam"
                              value={cell?.external_name ?? ""}
                              onChange={(e) =>
                                saveCell(d, meal, {
                                  external_name: e.target.value,
                                  recipe_id: null,
                                  location: "outside",
                                })
                              }
                              disabled={busy}
                            />
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => clearCell(d, meal)} disabled={!cell || busy}>
                            Clear
                          </button>
                          {busy && <span>Saving…</span>}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ opacity: 0.7 }}>
        Tip: add recipes on the <strong>Create</strong> page.
      </p>
    </div>
  );
}
