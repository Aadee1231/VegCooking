import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { startOfWeek, addDays, fmtISODate, niceDate } from "../lib/date";
import SearchableRecipeSelect, { type RecipeOpt } from "../components/SearchableRecipeSelect";
import { Link } from "react-router-dom";

/* ---------- Types ---------- */
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

/* ---------- Main ---------- */
export default function MealPlanPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeOpt[]>([]);
  const [, setUserId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<Record<string, string>>({});

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

  /* ---------- Navigation ---------- */
  function prevWeek() {
    setWeekStart(addDays(weekStart, -7));
  }
  function nextWeek() {
    setWeekStart(addDays(weekStart, 7));
  }
  function resetToday() {
    setWeekStart(startOfWeek(new Date()));
  }

  /* ---------- Helpers ---------- */
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
      window.vcToast(e.message ?? "Save failed");
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
      window.vcToast(e.message ?? "Delete failed");
    } finally {
      setSavingKey(null);
    }
  }

  /* ---------- UI ---------- */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minHeight: "calc(100vh - 90px)",
        background: "#f8faf8",
        padding: "2rem 1rem 3rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ color: "#2e7d32", fontSize: "2rem", fontWeight: 700 }}>Meal Planner</h2>
        <p style={{ color: "#555", fontSize: "1rem" }}>
          {niceDate(days[0])} – {niceDate(days[6])}
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            background: "#e8f5e9",
            padding: "8px 16px",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
            marginTop: "0.25rem",
          }}
        >
          <button className="btn-secondary" onClick={prevWeek}>
            ← Prev
          </button>
          <button className="btn" onClick={resetToday}>
            This Week
          </button>
          <button className="btn-secondary" onClick={nextWeek}>
            Next →
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          width: "100vw",
          maxWidth: "none",
          overflowX: "auto",
          borderRadius: "16px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "auto",
            textAlign: "center",
          }}
        >
          <thead style={{ background: "#f4f9f4", position: "sticky", top: 0, zIndex: 5 }}>
            <tr>
              <th
                style={{
                  color: "#2e7d32",
                  fontWeight: 700,
                  padding: "14px 10px",
                  width: "12%",
                }}
              >
                Meal / Day
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  style={{
                    color: "#2e7d32",
                    fontWeight: 600,
                    fontSize: "1rem",
                    padding: "14px 10px",
                    minWidth: "190px",
                  }}
                >
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
                    color: "#2e7d32",
                    background: "#f5f8f5",
                    padding: "12px 10px",
                    borderRight: "1px solid #ddd",
                    fontSize: "1rem",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {meal}
                </th>

                {days.map((d) => {
                  const cell = getCell(d, meal);
                  const key = `${fmtISODate(d)}-${meal}`;
                  const busy = savingKey === key;

                  return (
                    <td key={key} style={{ padding: "10px" }}>
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e5e5",
                          borderRadius: "10px",
                          minHeight: "120px",
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px",
                          boxShadow: "var(--shadow-sm)",
                          margin: "0 auto",
                        }}
                      >
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
                            fontSize: "0.9rem",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            marginBottom: 6,
                            textAlign: "center",
                          }}
                        >
                          <option value="home">Home</option>
                          <option value="outside">Outside</option>
                        </select>

                        {(cell?.location ?? "home") === "home" ? (
                          <>
                            <div style={{ width: "100%", flex: 1 }}>
                              <SearchableRecipeSelect
                                  value={cell?.recipe_id ?? null}
                                  onChange={(rid) => {
                                    void saveCell(d, meal, { recipe_id: rid, external_name: null, location: "home" });
                                  }}
                                  options={recipes}
                                  placeholder="Choose..."
                                  disabled={busy}
                                />
                            </div>
                            {cell?.recipe_id && (
                              <Link
                                to={`/r/${cell.recipe_id}`}
                                style={{
                                  fontSize: "0.8rem",
                                  marginTop: 4,
                                  color: "#1565c0",
                                }}
                              >
                                View →
                              </Link>
                            )}
                          </>
                        ) : (
                          <input
                            placeholder="Restaurant..."
                            value={editingText[key] ?? cell?.external_name ?? ""}
                            onChange={(e) =>
                              setEditingText((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            onBlur={() => {
                              const name = editingText[key] ?? "";
                              saveCell(d, meal, {
                                external_name: name,
                                recipe_id: null,
                                location: "outside",
                              });
                            }}
                            disabled={busy}
                            style={{
                              width: "100%",
                              fontSize: "0.9rem",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #ccc",
                            }}
                          />
                        )}

                        <button
                          className="btn-danger"
                          style={{
                            fontSize: "0.75rem",
                            padding: "6px 10px",
                            marginTop: 6,
                          }}
                          onClick={() => clearCell(d, meal)}
                          disabled={!cell || busy}
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
