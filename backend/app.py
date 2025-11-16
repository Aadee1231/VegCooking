import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from supabase import create_client, Client
from openai import OpenAI

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env var")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
#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

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY env var")

client = OpenAI(api_key=OPENAI_API_KEY)

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

class AIIngredient(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None

class VideoConvertRequest(BaseModel):
    url: Optional[str] = None           # TikTok / IG / YT link
    raw_text: Optional[str] = None      # caption, transcript, or your notes

class VideoRecipeResponse(BaseModel):
    title: str
    caption: Optional[str] = None
    description: Optional[str] = None
    servings: Optional[int] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    difficulty: Optional[str] = None
    tags: List[str] = []
    ingredients: List[AIIngredient] = []
    steps: List[str] = []


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

@app.post("/ai/convert-video", response_model=VideoRecipeResponse)
def convert_video_to_recipe(payload: VideoConvertRequest):
    """
    Convert a TikTok / Reels / YouTube cooking video into a structured recipe.
    For MVP we rely on the URL + any text the user provides (caption/notes).
    """

    if not payload.url and not payload.raw_text:
        raise HTTPException(status_code=400, detail="Provide either url or raw_text")

    # Build a clear text input for the model
    description_block = f"Video URL: {payload.url or 'N/A'}\n\nRaw text / caption:\n{payload.raw_text or 'N/A'}"

    # Prompt for structured recipe
    system_prompt = (
        "You are an assistant that converts short cooking videos into precise, "
        "structured recipes in JSON format. Be specific but don't hallucinate steps "
        "that aren't implied. If something is unknown, leave it null or empty."
    )

    user_prompt = (
        "Convert the following cooking content into a recipe.\n\n"
        f"{description_block}\n\n"
        "Return ONLY JSON matching this schema:\n"
        "{\n"
        "  \"title\": string,\n"
        "  \"caption\": string or null,\n"
        "  \"description\": string or null,\n"
        "  \"servings\": integer or null,\n"
        "  \"prep_time\": string or null,\n"
        "  \"cook_time\": string or null,\n"
        "  \"difficulty\": string or null,\n"
        "  \"tags\": string[],\n"
        "  \"ingredients\": [\n"
        "    {\"name\": string, \"quantity\": number or null, \"unit\": string or null, \"notes\": string or null}\n"
        "  ],\n"
        "  \"steps\": string[]\n"
        "}"
    )

    # Use the Responses API with structured JSON output
    try:
        response = client.responses.create(
            model="gpt-4.1-mini",  # good + cheaper, you can upgrade to gpt-5.1 later
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "recipe",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "caption": {"type": ["string", "null"]},
                            "description": {"type": ["string", "null"]},
                            "servings": {"type": ["integer", "null"]},
                            "prep_time": {"type": ["string", "null"]},
                            "cook_time": {"type": ["string", "null"]},
                            "difficulty": {"type": ["string", "null"]},
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "ingredients": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "quantity": {
                                            "type": ["number", "null"]
                                        },
                                        "unit": {
                                            "type": ["string", "null"]
                                        },
                                        "notes": {
                                            "type": ["string", "null"]
                                        },
                                    },
                                    "required": ["name"],
                                },
                            },
                            "steps": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["title", "ingredients", "steps"],
                    },
                    "strict": True,
                },
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")

    try:
        # Responses API returns structured output; we pull the JSON string then parse
        content = response.output[0].content[0].text  # type: ignore[attr-defined]
        data = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse model output: {e}")

    # Pydantic will validate this shape
    return VideoRecipeResponse(**data)
