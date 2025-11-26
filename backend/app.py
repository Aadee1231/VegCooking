import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env var")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

app = FastAPI()

# allow only your dev + prod origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://vegcooking.vercel.app",  # <- replace with your Vercel domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecipeIn(BaseModel):
    title: str
    caption: Optional[str] = None
    image_url: Optional[str] = None
    user_id: str  # pass the authenticated user's id from frontend

class RecipeOut(BaseModel):
    id: int
    title: str
    caption: Optional[str] = None
    image_url: Optional[str] = None
    user_id: str
    created_at: str

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/recipes", response_model=List[RecipeOut])
def list_recipes():
    # simple: read all
    res = supabase.table("recipes").select("*").order("created_at", desc=True).execute()
    return res.data or []

@app.post("/recipes", response_model=RecipeOut)
def create_recipe(payload: RecipeIn):
    # insert with service role, but RLS policies still apply when using anon keys.
    # here we use service role to ensure server-side control,
    # but we still require user_id from the client (from auth).
    insert_data = {
        "title": payload.title,
        "caption": payload.caption,
        "image_url": payload.image_url,
        "user_id": payload.user_id,
    }
    # call execute() directly (type stubs may not expose .select()/.single())
    res = supabase.table("recipes").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Insert failed")
    # supabase may return a list for insert; return the first item if so
    created = res.data[0] if isinstance(res.data, list) else res.data
    return created

@app.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, user_id: str):
    # only allow delete if belongs to provided user_id
    # enforce in code + rely on policy for defense-in-depth
    existing = supabase.table("recipes").select("*").eq("id", recipe_id).single().execute().data
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if existing["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your recipe")

    supabase.table("recipes").delete().eq("id", recipe_id).execute()
    return {"ok": True}