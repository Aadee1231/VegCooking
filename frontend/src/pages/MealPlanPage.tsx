import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { startOfWeek, addDays, fmtISODate, niceDate } from "../lib/date";
import SearchableRecipeSelect, { type RecipeOpt } from "../components/SearchableRecipeSelect";
import { Link } from "react-router-dom";

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

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid);

      const from = fmtISODate(days[0]);
      const to = fmtISODate(days[6]);

      const { data: rows } = await supabase
        .from("meal_plans")
        .select("*")
        .gte("plan_date", from)
        .lte("plan_date", to);
      setPlans((rows ?? []) as any);

      const { data: own } = await supabase
        .from("recipes")
        .select("id,title,user_id,is_public,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      const { data: added } = await supabase
        .from("user_added_recipes")
        .select("recipe:recipes(id,title,user_id,is_public,created_at)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      const combined = [...(own ?? []), ...((added ?? []).map((a: any) => a.recipe))];
      setRecipes(combined as any);
    })();
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
            external_name: Object.prototype.hasOwnProperty.call(data, "external_name")
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
    <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* === Header === */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <h2 style={{ color: "#2e7d32", fontSize: "1.6rem" }}>Meal Planner</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn" onClick={prevWeek}>← Prev</button>
          <button className="btn" onClick={resetToday}>This Week</button>
          <button className="btn" onClick={nextWeek}>Next →</button>
        </div>
      </div>

      <p style={{ color: "#555" }}>
        {niceDate(days[0])} – {niceDate(days[6])}
      </p>

      {/* === Grid === */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 10px",
          }}
        >
          <thead>
            <tr>
              <th style={{ padding: "10px", color: "#2e7d32", fontWeight: "600", textAlign: "left" }}>Meal / Day</th>
              {days.map((d) => (
                <th key={d.toISOString()} style={{ padding: "10px", color: "#2e7d32", textAlign: "center" }}>
                  {niceDate(d).split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEALS.map((meal) => (
              <tr key={meal}>
                <th
                  style={{
                    textTransform: "capitalize",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "#f4f9f4",
                    color: "#2e7d32",
                    borderRadius: "10px",
                  }}
                >
                  {meal}
                </th>
                {days.map((d) => {
                  const cell = getCell(d, meal);
                  const key = `${fmtISODate(d)}-${meal}`;
                  const busy = savingKey === key;

                  return (
                    <td key={key} style={{ padding: "8px", textAlign: "center" }}>
                      <div
                        style={{
                          background: cell ? "#ffffff" : "#f9f9f9",
                          border: "1px solid #e5e5e5",
                          borderRadius: "12px",
                          padding: "12px",
                          minWidth: 180,
                          boxShadow: cell ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                          transition: "0.2s",
                        }}
                      >
                        {/* Location selector */}
                        <select
                          value={cell?.location ?? "home"}
                          onChange={(e) => {
                            const loc = e.target.value as "home" | "outside";
                            saveCell(d, meal, {
                              location: loc,
                              recipe_id: loc === "outside" ? null : cell?.recipe_id ?? null,
                              external_name: loc === "outside" ? cell?.external_name ?? "" : null,
                            });
                          }}
                          disabled={busy}
                          style={{
                            width: "100%",
                            padding: "6px",
                            marginBottom: "8px",
                            borderRadius: "8px",
                            border: "1px solid #ccc",
                          }}
                        >
                          <option value="home">Home</option>
                          <option value="outside">Outside</option>
                        </select>

                        {/* Home Recipes */}
                        {(cell?.location ?? "home") === "home" ? (
                          <>
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
                              placeholder="Choose recipe..."
                              disabled={busy}
                            />
                            {cell?.recipe_id && (
                              <Link
                                to={`/r/${cell.recipe_id}`}
                                style={{
                                  display: "inline-block",
                                  marginTop: "6px",
                                  color: "#1565c0",
                                  fontSize: "0.9rem",
                                }}
                              >
                                View details →
                              </Link>
                            )}
                          </>
                        ) : (
                          <>
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
                              style={{
                                width: "100%",
                                padding: "6px",
                                borderRadius: "8px",
                                border: "1px solid #ccc",
                              }}
                            />
                          </>
                        )}

                        {/* Buttons */}
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
                          <button
                            className="btn btn-danger"
                            onClick={() => clearCell(d, meal)}
                            disabled={!cell || busy}
                          >
                            Clear
                          </button>
                          {busy && <span style={{ color: "#777" }}>Saving…</span>}
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

      <p style={{ opacity: 0.75, fontSize: "0.9rem", textAlign: "center" }}>
        💡 Tip: Add or import recipes from the <strong>Create</strong> page to use them here.
      </p>
    </div>
  );
}
