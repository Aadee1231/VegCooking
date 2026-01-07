import os
import re
import json
import decimal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any, cast
from supabase import create_client, Client
import modal
import base64
import json
import tempfile
import subprocess
import socket
import ipaddress
from urllib.parse import urlparse
from pathlib import Path

from fastapi import UploadFile, File
from openai import OpenAI

# Custom JSON encoder to handle Decimal types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super().default(obj)

def json_serialize(obj):
    """Helper function to serialize objects with Decimal types"""
    return json.loads(json.dumps(obj, cls=CustomJSONEncoder))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env var")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY env var")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

cookApp = FastAPI()
DEBUG_IMPORT = False

# allow only your dev + prod origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://vegcooking.vercel.app",  
    "*"
]

cookApp.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _setup_video_processing(video: UploadFile, temp_dir: str) -> tuple[Path, Path, List[str]]:
    """Setup video processing: save upload, extract audio and frames."""
    td_path = Path(temp_dir)
    video_path = td_path / f"upload_{video.filename}"
    audio_path = td_path / "audio.wav"
    frames_dir = td_path / "frames"

    contents = video.file.read()
    video_path.write_bytes(contents)

    extract_audio(str(video_path), str(audio_path)) 
    frame_paths = extract_frames(str(video_path), str(frames_dir), fps=1.5, max_frames=18)
    
    return audio_path, frame_paths

def _transcribe_audio(audio_path: Path) -> str:
    """Transcribe audio using OpenAI."""
    with open(audio_path, "rb") as f:
        transcript_obj = openai_client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=f,
        )
    return getattr(transcript_obj, "text", "") or ""

def _get_raw_extraction_schema() -> dict:
    """Get the JSON schema for raw recipe extraction."""
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "raw_ingredients": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": { "type": "string" },
                        "quantity_text": { "type": ["string", "null"] },
                        "source": { "type": "string", "enum": ["spoken", "visual", "assumed"] }
                    },
                    "required": ["name", "quantity_text", "source"]
                }
            },
            "raw_steps": {"type": "array", "items": {"type": "string"}},
            "oven_temp": {"type": ["string", "null"]},
            "bake_time": {"type": ["string", "null"]},
            "pan_size": {"type": ["string", "null"]},
            "servings_hint": {"type": ["string", "null"]},
        },
        "required": ["raw_ingredients", "raw_steps", "oven_temp", "bake_time", "pan_size", "servings_hint"],
    }

def _extract_raw_recipe_data(transcript_text: str, frame_paths: List[str]) -> dict:
    """Extract raw recipe data from transcript and video frames."""
    images = [{"type": "input_image", "image_url": to_data_url_jpg(p)} for p in frame_paths]
    raw_schema = _get_raw_extraction_schema()
    
    raw_prompt = f"""
You are extracting cooking info from a video.

Goal: CAPTURE EVERYTHING mentioned or shown. Completeness > cleanliness.

Rules:
- Do NOT summarize.
- Do NOT normalize ingredient names.
- Include ALL ingredients even if minor (nuts, water, flour, toppings, add-ins).
- Include ALL steps including prep, mixing, baking, cooling, serving.
- If something is mentioned or shown, include it.
- Output ONLY valid JSON.

IMPORTANT INFERENCE RULES:

- If a baked dessert batter is shown or described,
  and flour is NOT mentioned verbally,
  you MUST still include "flour" as an ingredient.

- If chopped nuts are visible in ANY frame,
  include them explicitly (e.g. "walnuts"),
  even if not spoken.

- If an ingredient is visually obvious but not spoken,
  include it and set source = "visual".

- If an ingredient is REQUIRED for the recipe to function
  (e.g. flour in brownies, walnuts or chocolate shards on top, etc.),
  include it and set source = "assumed".


Transcript:
{transcript_text}
"""

    raw_input_payload = [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": raw_prompt},
                *images,
            ],
        }
    ]

    raw_text_payload = {
        "format": {
            "type": "json_schema",
            "name": "raw_extraction",
            "schema": raw_schema,
        }
    }

    raw_resp = openai_client.responses.create(
        model="gpt-4o-mini",
        input=cast(Any, raw_input_payload),
        text=cast(Any, raw_text_payload),
    )

    try:
        raw_data = json.loads(raw_resp.output_text)
        if DEBUG_IMPORT:
            print("========== RAW EXTRACTION ==========")
            print("RAW INGREDIENTS:")
            for i, ing in enumerate(raw_data.get("raw_ingredients", []), 1):
                print(f"{i}. {ing}")

            print("\nRAW STEPS:")
            for i, step in enumerate(raw_data.get("raw_steps", []), 1):
                print(f"{i}. {step}")

            print("\nMETA:")
            print("oven_temp:", raw_data.get("oven_temp"))
            print("bake_time:", raw_data.get("bake_time"))
            print("pan_size:", raw_data.get("pan_size"))
            print("servings_hint:", raw_data.get("servings_hint"))
            print("===================================")
        return raw_data
    except Exception:
        raise HTTPException(status_code=500, detail=f"Pass 1 invalid JSON. Raw: {raw_resp.output_text[:400]}")

def _audit_missing_ingredients(raw_data: dict) -> List[str]:
    """Audit extracted data for missing implied ingredients."""
    audit_prompt = f"""
        You are auditing extracted cooking data for missing ingredients.

        RAW INGREDIENTS:
        {json.dumps(raw_data.get("raw_ingredients", []), indent=2)}

        RAW STEPS:
        {json.dumps(raw_data.get("raw_steps", []), indent=2)}

        TASK:
        - Identify any ingredients that are REQUIRED, IMPLIED, or VISUALLY OBVIOUS
        but missing from RAW INGREDIENTS.
        - Examples:
        - Flour in brownies or cakes
        - Walnuts or nuts if nut brownies
        - Chocolate chunks if visible
        - Baking pan grease
        - Do NOT repeat existing ingredients.
        - Do NOT invent quantities.

        Return ONLY valid JSON in this exact shape:
        {{
        "missing_ingredients": [string]
        }}
        """

    audit_resp = openai_client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "user",
                "content": [{"type": "input_text", "text": audit_prompt}],
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "audit_result",
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "missing_ingredients": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["missing_ingredients"]
                }
            }
        }
    )

    audit_data = json.loads(audit_resp.output_text)
    return audit_data.get("missing_ingredients", [])

def _merge_missing_ingredients(raw_data: dict, missing_ingredients: List[str]) -> None:
    """Merge missing ingredients into raw_data."""
    existing_norms = {
        norm_name(ing["name"])
        for ing in raw_data.get("raw_ingredients", [])
    }

    for name in missing_ingredients:
        if norm_name(name) in existing_norms:
            continue

        raw_data["raw_ingredients"].append({
            "name": name,
            "quantity_text": None,
            "source": "assumed"
        })

    if DEBUG_IMPORT:
        print("========== SANITY CHECK ==========")
        print("Added inferred ingredients:", missing_ingredients)
        print("=================================")

def _get_final_recipe_schema() -> dict:
    """Get the JSON schema for final recipe structuring."""
    return {
        "name": "recipe_draft",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "title": {"type": "string"},
                "caption": {"type": ["string", "null"]},
                "description": {"type": ["string", "null"]},
                "servings": {"type": ["integer", "null"]},
                "prep_time": {"type": ["string", "null"]},
                "cook_time": {"type": ["string", "null"]},
                "difficulty": {"type": ["string", "null"], "enum": ["Easy", "Medium", "Hard", None]},
                "tags": {"type": "array", "items": {"type": "string"}},
                "ingredients": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string"},
                            "ingredient_id": {"type": ["integer", "null"]},
                            "quantity": {"type": ["number", "null"]},
                            "unit": {"type": ["string", "null"]},
                            "notes": {"type": ["string", "null"]},
                        },
                        "required": ["name", "ingredient_id", "quantity", "unit", "notes"],
                    },
                },
                "steps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False, 
                        "properties": {
                            "position": {"type": "integer"},
                            "body": {"type": "string"},
                        },
                        "required": ["position", "body"],
                    },
                },
            },
            "required": ["title", "caption", "description", "servings", "prep_time", "cook_time", "difficulty", "tags", "ingredients", "steps"],
        },
        "strict": True,
    }

def _structure_final_recipe(raw_data: dict, transcript_text: str) -> dict:
    """Structure the final recipe from raw extracted data."""
    schema = _get_final_recipe_schema()
    
    prompt_text = f"""
You are converting a cooking video into a clean recipe JSON.

You MUST use the extracted lists below as source-of-truth.
Do not omit items from them.

RAW_INGREDIENTS (source-of-truth):
{json.dumps(raw_data.get("raw_ingredients", []), ensure_ascii=False)}

RAW_STEPS (source-of-truth):
{json.dumps(raw_data.get("raw_steps", []), ensure_ascii=False)}

Hints:
- oven_temp: {raw_data.get("oven_temp")}
- bake_time: {raw_data.get("bake_time")}
- pan_size: {raw_data.get("pan_size")}
- servings_hint: {raw_data.get("servings_hint")}

Rules:
- Return ONLY valid JSON that matches the schema. No extra keys, no markdown.
- Every RAW_INGREDIENT must appear in ingredients[] (normalized).
- Every ingredient must be used in at least one step.
- Steps must cover full process start→finish (preheat, mix, add-ins, pan, bake, cool, serve).
- ingredient_id must be null (server will fill it).
- Diet tags:
  - No animal products => Vegan (and NOT Vegetarian).
  - Dairy present but no eggs => Vegetarian (and NOT Vegan).
  - Never include both.
- If baking is present, cook_time MUST be filled.


ACCURACY + COMPLETENESS (MOST IMPORTANT)
- Produce a COMPLETE recipe: do not omit ingredients or steps that appear in the transcript or on-screen text.
- If any ingredient is mentioned in transcript OR visible on screen, it MUST appear in the ingredients list.
- Every ingredient in the ingredients list MUST be used in at least one step.
- Steps MUST cover the entire process from start to finish (prep → cook/bake → cool/finish).

TITLE
- Title must be specific and correct (ex: "Vegan Brownies").
- Do NOT use generic titles like "Chocolate Cake" unless the recipe is explicitly cake.
- If baked in a square/rectangular pan and sliced into squares/bars, prefer "brownies" or "bars" over "cake".

DIET TAG LOGIC (HARD RULES)
- If there are NO animal products (no eggs, dairy, meat, honey), include tag "Vegan".
- If eggs are absent but dairy is present, include tag "Vegetarian" (and do NOT include Vegan).
- Never include both "Vegan" and "Vegetarian" together.
- Tags must come only from this set if relevant:
  Vegan, Vegetarian, Gluten-Free, Dairy-Free, Healthy, Dessert, Comfort Food, Quick, Breakfast, Dinner, Spicy
- Only include tags that are clearly supported by the recipe.

SERVINGS + TIMES
- If servings are stated, use them.
- If not stated, infer servings using pan size or typical yield or ingredient quantity (ex: "9" for a 9-inch square pan).
- If baking is present, cook_time MUST be included and must reflect the baking time.
- prep_time should reflect mixing + prep steps (reasonable estimate if not stated).
- Prefer concise time strings like "10 min" or "12-15 min" (not paragraphs).

INGREDIENTS
- Ingredients must be normalized to common names (ex: "cocoa powder", "all-purpose flour", "vegetable oil").
- Include ALL ingredients with correct amounts when available.
- If a quantity is known but unit is unclear, set unit to null.
- If both quantity and unit are unknown, set both to null, but still include the ingredient name.
- If an ingredient is "divided or chopped" (ex: chocolate shards), keep it as ONE ingredient and put "divided" in notes.

STEPS
- MAKE STEPS AS DETAILED AS POSSIBLE FOR USERS
- Steps must be short, clear, and in correct order.
- Include temperatures and baking times exactly if stated; otherwise infer from context only if strongly implied.
- Baking recipes MUST include:
  1) Preheat instruction
  2) Mixing instructions in correct grouping (dry/wet if relevant)
  3) Pan size / lining/greasing if mentioned or visible
  4) Bake temperature + time
  5) Cooling instruction
  6) Final serve/slice step
- Do not collapse the recipe into vague steps like "mix everything"; be specific about what gets added when.

CONSISTENCY CHECK (SELF-VERIFY BEFORE FINAL OUTPUT)
- Verify no important ingredients are missing (especially add-ins like nuts/chocolate).
- Verify steps include baking + cooling if baked.
- Verify tags obey the Vegan/Vegetarian rule.

- If amounts are unknown, set quantity/unit to null.
- Difficulty must be Easy/Medium/Hard.
- Do NOT stop early in figuring out steps and writting all the steps in detail.
- Return ONLY the JSON in the schema.
Transcript (For extra context if needed):
{transcript_text}
"""

    input_payload = [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt_text},
            ],
        }
    ]

    text_payload = {
        "format": {
            "type": "json_schema",
            "name": "recipe_draft",      
            "schema": schema["schema"],       
        }
    }

    resp = openai_client.responses.create(
        model="gpt-4o-mini",
        input=cast(Any, input_payload),   
        text=cast(Any, text_payload),     
    )

    try:
        data = json.loads(resp.output_text)
        if DEBUG_IMPORT:
            print("========== FINAL INGREDIENTS ==========")
            for i, ing in enumerate(data.get("ingredients", []), 1):
                print(f"{i}. {ing.get('name')} | qty={ing.get('quantity')} | unit={ing.get('unit')}")
            print("======================================")
        return data
    except Exception:
        raise HTTPException(status_code=500, detail=f"Model did not return valid JSON. Raw: {resp.output_text[:400]}")

def _resolve_ingredient_ids(data: dict, created_by: Optional[int] = None) -> None:
    """Resolve or create ingredient IDs for all ingredients."""
    ingredient_map = load_ingredient_map()

    for ing in data.get("ingredients", []):
        name = (ing.get("name") or "").strip()
        if not name:
            continue
        ing["ingredient_id"] = resolve_or_create_ingredient(
            ingredient_map,
            name,
            created_by=created_by
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

class DraftIngredient(BaseModel):
    name: str
    ingredient_id: Optional[int] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None

class DraftStep(BaseModel):
    position: int
    body: str

class RecipeDraft(BaseModel):
    title: str
    caption: Optional[str] = None
    description: Optional[str] = None
    servings: Optional[int] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    difficulty: Optional[str] = None
    tags: List[str] = []
    ingredients: List[DraftIngredient] = []
    steps: List[DraftStep] = []

class VideoUrlIn(BaseModel):
    url: str



@cookApp.get("/health")
def health():
    return {"ok": True}

@cookApp.get("/recipes", response_model=List[RecipeOut])
def list_recipes():
    # simple: read all
    res = supabase.table("recipes").select("*").order("created_at", desc=True).execute()
    return res.data or []

@cookApp.post("/recipes", response_model=RecipeOut)
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

@cookApp.delete("/recipes/{recipe_id}")
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

def run_ffmpeg(cmd: List[str]) -> None:
    # ffmpeg is noisy; we just want it to fail loudly if needed
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {res.stderr[-800:]}")

def extract_audio(video_path: str, out_wav_path: str) -> None:
    # mono 16k wav is perfect for transcription
    run_ffmpeg([
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        out_wav_path
    ])

def extract_frames(video_path: str, frames_dir: str, fps: float = 1.0, max_frames: int = 12) -> List[str]:
    """
    Extract ~1 frame per second, then keep only the first max_frames frames.
    """
    Path(frames_dir).mkdir(parents=True, exist_ok=True)
    out_pattern = str(Path(frames_dir) / "frame_%03d.jpg")

    run_ffmpeg([
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"fps={fps}",
        out_pattern
    ])

    frames = sorted(Path(frames_dir).glob("frame_*.jpg"))
    frames = frames[:max_frames]
    return [str(p) for p in frames]

def to_data_url_jpg(path: str) -> str:
    b = Path(path).read_bytes()
    b64 = base64.b64encode(b).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

def norm_name(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

def load_ingredient_map() -> dict:
    # Pull only what we need for matching
    rows = supabase.table("ingredients").select("id,name,norm_name").execute().data or []
    return { (r.get("norm_name") or norm_name(r["name"])): r for r in rows }

def resolve_or_create_ingredient(ingredient_map: dict, name: str, created_by: Optional[str] = None) -> int:
    key = norm_name(name)

    # 1) Match existing
    if key in ingredient_map:
        return int(ingredient_map[key]["id"])

    # 2) Create new
    payload = {
        "name": name.strip(),
    }
    if created_by:
        payload["created_by"] = created_by

    created = supabase.table("ingredients").insert(payload).execute().data
    if not created:
        # Edge case: race condition where another request inserted it
        # Re-fetch once
        rows = supabase.table("ingredients").select("id,name,norm_name").eq("norm_name", key).execute().data or []
        if rows:
            ingredient_map[key] = rows[0]
            return int(rows[0]["id"])
        raise RuntimeError("Failed to create ingredient")

    ingredient_map[key] = created[0]
    return int(created[0]["id"])

def _is_public_http_url(url: str) -> bool:
    try:
        u = urlparse(url)
        if u.scheme not in ("http", "https"):
            return False
        if not u.netloc:
            return False

        host = u.hostname
        if not host:
            return False

        # Resolve hostname -> IP and block private/internal ranges
        ip_str = socket.gethostbyname(host)
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False

        return True
    except Exception:
        return False

def download_video_from_url(url: str, temp_dir: str) -> Path:
    """
    Downloads a low-res MP4 into temp_dir and returns the path.
    Uses yt-dlp and keeps file only inside temp_dir (auto-deleted by TemporaryDirectory).
    """
    
    outtmpl = Path(temp_dir) / "video.mp4"

    import yt_dlp

    # Configure options
    ydl_opts = {
        'js_runtimes': {
            'deno': {
                'path': '/root/.deno/bin/deno'
            }
        },
        'format': 'bv*[ext=mp4][height<=360]+ba[ext=m4a]/b[ext=mp4][height<=360]/b',
        'merge_output_format': 'mp4',
        'max_filesize': 200 * 1024 * 1024,  # 200MB in bytes
        'outtmpl': str(outtmpl),
        'noplaylist': True,
    }

    # Download
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    return outtmpl

@cookApp.post("/download-video-test")
def download_video_test(request: dict):
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    # Run deno --version 
    res = subprocess.run("bash -c 'source /root/.bashrc && deno --version'", shell=True, text=True)
    print("attempt 2:", res.stdout)
    if res.returncode != 0:
        print("Error:", res.stderr)
    with tempfile.TemporaryDirectory() as td:
        path = download_video_from_url(url, td)
        print("Downloaded video to:", path)
        return {"path": str(path)}

class SmartMealPlanRequest(BaseModel):
    user_id: str
    week_start: str
    existing_plans: List[dict] = []

class MealSuggestion(BaseModel):
    date: str
    meal: str
    recipe_id: int
    reason: str

class SmartMealPlanResponse(BaseModel):
    suggestions: List[MealSuggestion]
    shared_ingredients: List[str]
    efficiency_score: float

@cookApp.post("/smart-meal-plan", response_model=SmartMealPlanResponse)
async def smart_meal_plan(request: SmartMealPlanRequest):
    """
    AI-powered meal planning that considers:
    - User's past recipe likes and saved recipes
    - Dietary goals and preferences
    - Ingredient overlap to reduce waste
    - Meal type differentiation (breakfast, lunch, dinner)
    """
    try:
        print(f"Starting smart meal plan for user: {request.user_id}")
        
        # Fetch user's recipe interaction history
        user_history = await _get_user_recipe_history(request.user_id)
        
        # Get user's available recipe IDs
        user_recipe_ids = user_history.get("available_recipe_ids", [])
        print(f"User has access to {len(user_recipe_ids)} recipes")
        
        if not user_recipe_ids:
            print("No recipes available for this user")
            return SmartMealPlanResponse(
                suggestions=[],
                shared_ingredients=[],
                efficiency_score=0.0
            )
        
        # Fetch available recipes with ingredients for this user only
        available_recipes = await _get_recipes_with_ingredients(user_recipe_ids)
        
        # Get existing plans for the week to avoid duplicates
        existing_meal_slots = {
            f"{plan.get('plan_date')}-{plan.get('meal')}" 
            for plan in request.existing_plans
        }
        print(f"Existing meal slots to avoid: {len(existing_meal_slots)}")
        
        # Generate smart meal plan using AI
        meal_plan = await _generate_smart_meal_plan(
            user_history=user_history,
            available_recipes=available_recipes,
            week_start=request.week_start,
            existing_slots=existing_meal_slots
        )
        
        print(f"Generated {len(meal_plan.suggestions)} meal suggestions")
        return meal_plan
        
    except Exception as e:
        print(f"Error in smart_meal_plan: {e}")
        raise HTTPException(status_code=500, detail=f"Meal planning failed: {str(e)}")

async def _get_user_recipe_history(user_id: str) -> dict:
    """Get user's recipe interactions, likes, and preferences"""
    try:
        print(f"Fetching recipes for user_id: {user_id}")
        
        # Get user's created recipes
        created_res = (
            supabase
            .table("recipes")
            .select("id,title,tags,created_at")
            .eq("user_id", user_id)
            .execute()
        )
        print(f"Created recipes: {len(created_res.data or [])}")
        
        # Get user's saved/added recipes from public recipes
        added_res = (
            supabase
            .table("user_added_recipes")
            .select("recipe_id,created_at")
            .eq("user_id", user_id)
            .execute()
        )
        print(f"User added recipes: {len(added_res.data or [])}")
        
        # Get user's meal plan history to analyze preferences
        plans_res = (supabase.table("meal_plans")
            .select("recipe_id,plan_date,meal,created_at")
            .eq("user_id", user_id)
            .not_("recipe_id", "is", None)
            .order("created_at", desc=True)
            .limit(100)
            .execute())
        print(f"Meal plans: {len(plans_res.data or [])}")
        
        # Get recipe details for added recipes
        added_recipe_ids = [item["recipe_id"] for item in (added_res.data or [])]
        added_recipes_details = []
        if added_recipe_ids:
            details_res = (supabase.table("public_recipes_with_stats")
                .select("id,title,tags,difficulty,prep_time,cook_time")
                .in_("id", added_recipe_ids)
                .execute())
            added_recipes_details = details_res.data or []
        
        # Combine all available recipes for this user
        all_user_recipes = (created_res.data or []) + added_recipes_details
        
        # Analyze patterns from history
        recipe_frequency = {}
        meal_preferences = {"breakfast": {}, "lunch": {}, "dinner": {}}
        
        for plan in (plans_res.data or []):
            recipe_id = plan.get("recipe_id")
            meal_type = plan.get("meal")
            
            if recipe_id:
                recipe_frequency[recipe_id] = recipe_frequency.get(recipe_id, 0) + 1
                meal_preferences[meal_type][recipe_id] = meal_preferences[meal_type].get(recipe_id, 0) + 1
        
        result = {
            "created_recipes": json_serialize(created_res.data or []),
            "added_recipes": json_serialize(added_recipes_details),
            "recipe_frequency": json_serialize(recipe_frequency),
            "meal_preferences": json_serialize(meal_preferences),
            "total_planned": len(plans_res.data or []),
            "available_recipe_ids": json_serialize([r["id"] for r in all_user_recipes])
        }
        
        print(f"User history result: {result}")
        return result
        
    except Exception as e:
        print(f"Error fetching user history: {e}")
        return {
            "created_recipes": [], 
            "added_recipes": [],
            "recipe_frequency": {}, 
            "meal_preferences": {}, 
            "total_planned": 0,
            "available_recipe_ids": []
        }

async def _get_recipes_with_ingredients(user_recipe_ids: List[int] = None) -> List[dict]:
    """Get user's recipes with their ingredients for analysis"""
    try:
        # Only get recipes that belong to this user
        if not user_recipe_ids:
            print("No user recipe IDs provided")
            return []
            
        print(f"Fetching ingredients for recipe IDs: {user_recipe_ids}")
        
        # Get recipes with ingredients for user's recipes only
        recipes_res = (supabase.table("public_recipes_with_stats")
            .select("id,title,tags,difficulty,prep_time,cook_time")
            .in_("id", user_recipe_ids)
            .execute())
        
        print(f"Found {len(recipes_res.data or [])} recipes")
        
        # Get ingredients for each recipe
        recipes_with_ingredients = []
        for recipe in (recipes_res.data or []):
            ingredients_res = (supabase.table("recipe_ingredients")
                .select("ingredient_id,quantity,unit")
                .eq("recipe_id", recipe["id"])
                .execute())
            
            # Get ingredient details
            ingredient_ids = [ing["ingredient_id"] for ing in (ingredients_res.data or [])]
            ingredients_details = {}
            if ingredient_ids:
                details_res = (supabase.table("ingredients")
                    .select("id,name,norm_name")
                    .in_("id", ingredient_ids)
                    .execute())
                ingredients_details = {
                    ing["id"]: ing["name"] 
                    for ing in (details_res.data or [])
                }
            
            recipe_data = {
                **recipe,
                "ingredients": [
                    {
                        "name": ingredients_details.get(ing["ingredient_id"], "Unknown"),
                        "ingredient_id": ing["ingredient_id"],
                        "quantity": float(ing["quantity"]) if ing.get("quantity") else None,
                        "unit": ing["unit"]
                    }
                    for ing in (ingredients_res.data or [])
                ]
            }
            recipes_with_ingredients.append(json_serialize(recipe_data))
        
        print(f"Returning {len(recipes_with_ingredients)} recipes with ingredients")
        return recipes_with_ingredients
        
    except Exception as e:
        print(f"Error fetching recipes with ingredients: {e}")
        return []

async def _generate_smart_meal_plan(user_history: dict, available_recipes: List[dict], week_start: str, existing_slots: set) -> SmartMealPlanResponse:
    """Use AI to generate an optimal meal plan"""
    
    # Prepare context for AI
    context_prompt = f"""
    You are an expert meal planning AI. Create a 7-day meal plan that maximizes efficiency and user satisfaction.

    USER PROFILE:
    - Has planned {user_history.get('total_planned', 0)} meals in the past
    - Frequently uses recipes: {list(user_history.get('recipe_frequency', {}).keys())[:5]}
    - Meal preferences: {user_history.get('meal_preferences', {})}

    AVAILABLE RECIPES:
    {len(available_recipes)} recipes available with full ingredient data

    REQUIREMENTS:
    1. Create meal suggestions for 7 days starting {week_start}
    2. Only suggest breakfast, lunch, and dinner (no snacks)
    3. Maximize ingredient overlap to reduce waste
    4. Prioritize recipes the user has used before
    5. Ensure variety (don't repeat same recipe within 3 days)
    6. Consider meal appropriatene (breakfast foods for breakfast, etc.)
    7. Balance difficulty levels throughout the week

    EXISTING SLOTS TO AVOID:
    {list(existing_slots)[:10]}...

    Return JSON with:
    - suggestions: array of {{date, meal, recipe_id, reason}}
    - shared_ingredients: array of ingredients used across multiple meals
    - efficiency_score: float 0-1 indicating ingredient overlap efficiency
    """
    
    try:
        # Use OpenAI to generate the meal plan
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a meal planning expert. Return only valid JSON."},
                {"role": "user", "content": context_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Validate and structure the response
        suggestions = []
        for suggestion in result.get("suggestions", []):
            # Verify the recipe exists
            recipe_exists = any(r["id"] == suggestion["recipe_id"] for r in available_recipes)
            if recipe_exists:
                suggestions.append(MealSuggestion(**suggestion))
        
        return SmartMealPlanResponse(
            suggestions=suggestions,
            shared_ingredients=result.get("shared_ingredients", []),
            efficiency_score=result.get("efficiency_score", 0.5)
        )
        
    except Exception as e:
        print(f"AI meal planning error: {e}")
        # Fallback to simple meal plan
        return _generate_fallback_meal_plan(available_recipes, week_start, existing_slots)

def _generate_fallback_meal_plan(available_recipes: List[dict], week_start: str, existing_slots: set) -> SmartMealPlanResponse:
    """Generate a simple meal plan as fallback"""
    import random
    from datetime import datetime, timedelta
    
    suggestions = []
    meals = ["breakfast", "lunch", "dinner"]
    
    # Filter for suitable recipes
    suitable_recipes = [r for r in available_recipes if r.get("difficulty") in ["Easy", "Medium"]]
    
    if not suitable_recipes:
        suitable_recipes = available_recipes[:10]  # Use any recipes if none are suitable
    
    start_date = datetime.strptime(week_start, "%Y-%m-%d")
    
    for day_offset in range(7):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")
        
        for meal in meals:
            slot_key = f"{date_str}-{meal}"
            if slot_key not in existing_slots:
                recipe = random.choice(suitable_recipes)
                suggestions.append(MealSuggestion(
                    date=date_str,
                    meal=meal,
                    recipe_id=recipe["id"],
                    reason=f"Simple {meal} option"
                ))
    
    return SmartMealPlanResponse(
        suggestions=suggestions,
        shared_ingredients=[],
        efficiency_score=0.3
    )

@cookApp.post("/video-import", response_model=RecipeDraft)
async def video_import(video: UploadFile = File(...)):
    """
    Takes a user-uploaded cooking video and returns a structured RecipeDraft JSON.
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    with tempfile.TemporaryDirectory() as td:
        # Setup video processing and extract audio/frames
        audio_path, frame_paths = _setup_video_processing(video, td)
        
        # Transcribe audio
        transcript_text = _transcribe_audio(audio_path)
        
        # Extract raw recipe data
        raw_data = _extract_raw_recipe_data(transcript_text, frame_paths)
        
        # Audit for missing ingredients
        missing_ingredients = _audit_missing_ingredients(raw_data)
        _merge_missing_ingredients(raw_data, missing_ingredients)
        
        # Structure final recipe
        data = _structure_final_recipe(raw_data, transcript_text)
        
        # Resolve ingredient IDs
        _resolve_ingredient_ids(data, created_by=None)
        
        # Return response
        from fastapi.responses import JSONResponse
        return JSONResponse(content=data)
