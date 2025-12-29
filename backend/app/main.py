import os
import re
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
from pathlib import Path

from fastapi import UploadFile, File
from openai import OpenAI

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
