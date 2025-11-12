// All frontend API calls go through the same origin (/api/*) which is proxied to Modal.
// In local dev, you can set VITE_API_BASE_URL to http://localhost:8000 for direct calls.
const base =
  import.meta.env.VITE_API_BASE_URL /* optional override */ || "";

export async function listRecipes() {
  const url = base ? `${base}/recipes` : `/api/recipes`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to fetch recipes");
  return r.json();
}

export async function createRecipe(input: {
  title: string;
  caption?: string;
  image_url?: string;
  user_id: string;
}) {
  const url = base ? `${base}/recipes` : `/api/recipes`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error("Failed to create recipe");
  return r.json();
}

export async function deleteRecipe(id: number, user_id: string) {
  const url = base ? `${base}/recipes/${id}?user_id=${user_id}` : `/api/recipes/${id}?user_id=${user_id}`;
  const r = await fetch(url, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete recipe");
  return r.json();
}
