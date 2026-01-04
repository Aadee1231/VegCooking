import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

import dotenv from "dotenv";
import path from "path";

// Force-load .env.seed (Windows-safe)
dotenv.config({
  path: path.resolve(__dirname, ".env.seed"),
});

console.log("🔥 SEED SCRIPT STARTED");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log(
  "SERVICE_ROLE_KEY PRESENT:",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
);


const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SEED_PASSWORD = process.env.SEED_PASSWORD || "FlavurSeedPassword123!";

const AVATAR_IMAGES = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
];

const RECIPE_IMAGES = {
  Indian: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
  Italian: "https://images.unsplash.com/photo-1525755662778-989d0524087e",
  Mexican: "https://images.unsplash.com/photo-1601924582975-7e6702e1b0aa",
  Thai: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12",
  Korean: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
  Japanese: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
  Mediterranean: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
  American: "https://images.unsplash.com/photo-1550547660-d9450f859349",
};



if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env.seed");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type SeedUserPlan = {
  email: string;
  username: string;
  full_name: string;
  bio: string;
  city: "Charlotte, NC" | "Raleigh, NC" | "San Francisco, CA" | "Los Angeles, CA";
  dietary_tags: string[]; // e.g. ["vegan"], ["halal"], []
  recipe_count: number; // >=3
};

function randomDatePast30Days() {
  const now = new Date();
  const daysBack = faker.number.int({ min: 0, max: 29 });
  const hours = faker.number.int({ min: 0, max: 23 });
  const mins = faker.number.int({ min: 0, max: 59 });
  const d = new Date(now);
  d.setDate(now.getDate() - daysBack);
  d.setHours(hours, mins, 0, 0);
  return d.toISOString();
}

function pick<T>(arr: T[]) {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })];
}

const CUISINES = ["Indian", "Italian", "Mexican", "American", "Thai", "Mediterranean", "Korean", "Japanese"];
const DIETS = ["vegan", "vegetarian", "halal", "gluten-free", "dairy-free", "high-protein", "none"];

function generateRecipe(diet: string) {
  const cuisine = pick(CUISINES);
  const isVegan = diet === "vegan";
  const isVeg = diet === "vegetarian";

  const mainTemplates = [
    `${cuisine} ${isVegan ? "Vegan" : isVeg ? "Vegetarian" : ""} Bowl`,
    `${cuisine} Style ${isVegan ? "Tofu" : isVeg ? "Paneer" : "Chicken"} Wrap`,
    `${cuisine} ${isVegan ? "Chickpea" : isVeg ? "Lentil" : "Salmon"} Curry`,
    `${cuisine} Street-Style ${isVegan ? "Veggie" : isVeg ? "Veggie" : "Beef"} Tacos`,
    `${cuisine} Noodles with ${isVegan ? "Sesame" : isVeg ? "Garlic" : "Spicy"} Sauce`,
  ];

  const title = faker.helpers.shuffle(mainTemplates)[0].replace(/\s+/g, " ").trim();
  const caption = faker.helpers.maybe(() => faker.lorem.sentence({ min: 4, max: 9 }), { probability: 0.8 }) ?? null;
  const description = `${title} inspired by ${cuisine} flavors. 
    This recipe is ${diet !== "none" ? diet : "flexible"}-friendly and designed 
    for home cooks who want bold flavor without unnecessary steps.`;

  // image_url: set placeholder path that you can later upload into Supabase Storage
  // You will update these easily later.
  const image_url = RECIPE_IMAGES[cuisine as keyof typeof RECIPE_IMAGES];

  const steps = [
    "Prep and measure ingredients.",
    "Heat pan/oil and sauté aromatics (onion/garlic/ginger).",
    "Add main ingredients and spices; cook until fragrant.",
    "Add sauce/liquid; simmer until everything is tender.",
    "Taste, adjust salt/acid/spice, and serve hot.",
  ].map((body, idx) => ({
    position: idx + 1,
    body,
    timer_seconds: faker.helpers.maybe(() => faker.number.int({ min: 60, max: 900 }), { probability: 0.4 }) ?? null,
  }));

  // Ingredients: we’ll attach later via a simple “pick random existing ingredients from your table” query
  // so we don’t guess IDs.
  const ingredientNotes = [
    "to taste",
    "optional",
    "finely chopped",
    "fresh if possible",
    "adjust for spice level",
  ];

  const ingredientsSpec = faker.number.int({ min: 6, max: 10 });

  return {
    diet,
    cuisine,
    title,
    caption,
    description,
    image_url,
    steps,
    ingredientsSpec,
    ingredientNotes,
  };
}

function quantityForIngredient(name: string) {
  const n = name.toLowerCase();
  if (n.includes("salt") || n.includes("pepper") || n.includes("spice"))
    return { qty: faker.number.float({ min: 0.25, max: 2 }), unit: "tsp" };

  if (n.includes("oil") || n.includes("sauce"))
    return { qty: faker.number.float({ min: 1, max: 3 }), unit: "tbsp" };

  if (n.includes("chicken") || n.includes("beef") || n.includes("tofu"))
    return { qty: faker.number.int({ min: 150, max: 400 }), unit: "g" };

  if (n.includes("onion") || n.includes("tomato"))
    return { qty: faker.number.int({ min: 1, max: 3 }), unit: "pc" };

  return { qty: faker.number.float({ min: 0.5, max: 2 }), unit: "cup" };
}


async function getAllIngredientIds(): Promise<number[]> {
  const { data, error } = await supabase.from("ingredients").select("id").limit(5000);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.id);
}

async function getAllUnitCodes(): Promise<string[]> {
  const { data, error } = await supabase.from("units").select("code").limit(2000);
  if (error) {
    // If you don’t have units table, fall back safely.
    return ["tsp", "tbsp", "cup", "g", "kg", "ml", "l", "pc"];
  }
  return (data ?? []).map((r: any) => r.code).filter(Boolean);
}

async function main() {
  console.log("✅ Loading ingredient IDs + unit codes...");
  const ingredientIds = await getAllIngredientIds();
  if (ingredientIds.length < 50) {
    console.warn("⚠️ Your ingredients table looks small. Seeding will still work, but recipes may reuse ingredients.");
  }
  const unitCodes = await getAllUnitCodes();

  // --- Build EXACTLY 25 seed users with your city constraints ---
  // Constraints you gave:
  // Charlotte: 5–15
  // Raleigh:   5–15
  // SF:        4–5
  // LA:        1–2
  //
  // We'll do: Charlotte 9, Raleigh 9, SF 5, LA 2  => total 25
  const plans: SeedUserPlan[] = [ 
    // Charlotte (9)
    { email: "chef01@flavur.app", username: "mayavance", full_name: "Maya Vance", bio: "Home cook who meal preps on Sundays. Big on bold spices and weeknight wins.", city: "Charlotte, NC", dietary_tags: ["vegetarian"], recipe_count: 4 },
    { email: "chef02@flavur.app", username: "Jo Kim", full_name: "Jo Kim", bio: "Trying to eat healthier without losing flavor. Love bowls, sauces, and crunchy toppings.", city: "Charlotte, NC", dietary_tags: [], recipe_count: 3 },
    { email: "chef03@flavur.app", username: "Aisha Malik", full_name: "Aisha Malik", bio: "Halal-friendly comfort food, but I’ll still keep it simple. Tea and leftovers are my love language.", city: "Charlotte, NC", dietary_tags: ["halal"], recipe_count: 4 },
    { email: "chef04@flavur.app", username: "Daniel Ortiz", full_name: "Daniel Ortiz", bio: "I cook like I’m feeding a whole family even when it’s just me. Sauce-first mindset.", city: "Charlotte, NC", dietary_tags: [], recipe_count: 3 },
    { email: "chef05@flavur.app", username: "Keira Thompson", full_name: "Keira Thompson", bio: "Mostly plant-based, occasionally chaotic, always hungry. Quick recipes only.", city: "Charlotte, NC", dietary_tags: ["vegan"], recipe_count: 5 },
    { email: "chef06@flavur.app", username: "Samir Patel", full_name: "Samir Patel", bio: "Spice cabinet enthusiast. I tweak every recipe once and pretend it was always mine.", city: "Charlotte, NC", dietary_tags: ["vegetarian"], recipe_count: 3 },
    { email: "chef07@flavur.app", username: "Olivia Brooks", full_name: "Olivia Brooks", bio: "If it’s not crispy, I don’t want it. Air fryer + stovetop = best combo.", city: "Charlotte, NC", dietary_tags: [], recipe_count: 4 },
    { email: "chef08@flavur.app", username: "Nate Wallace", full_name: "Nate Wallace", bio: "Gym days = high protein. Rest days = pasta. I don’t make the rules.", city: "Charlotte, NC", dietary_tags: [], recipe_count: 3 },
    { email: "chef09@flavur.app", username: "Priya Shah", full_name: "Priya Shah", bio: "Indian-ish cooking with modern shortcuts. I’ll teach you the ‘lazy but good’ way.", city: "Charlotte, NC", dietary_tags: ["vegetarian"], recipe_count: 4 },

    // Raleigh (9) 
    { email: "chef10@flavur.app", username: "Ethan Carter", full_name: "Ethan Carter", bio: "Weeknight meals for people who hate dishes. One-pan and done.", city: "Raleigh, NC", dietary_tags: [], recipe_count: 3 },
    { email: "chef11@flavur.app", username: "Sofia Nguyen", full_name: "Sofia Nguyen", bio: "Love bright flavors: lime, herbs, chili oils. My fridge is 70% sauces.", city: "Raleigh, NC", dietary_tags: [], recipe_count: 4 },
    { email: "chef12@flavur.app", username: "Hannah Price", full_name: "Hannah Price", bio: "Mostly vegan, sometimes just ‘accidentally’ vegan. Dessert counts as balance.", city: "Raleigh, NC", dietary_tags: ["vegan"], recipe_count: 5 },
    { email: "chef13@flavur.app", username: "Malik Johnson", full_name: "Malik Johnson", bio: "Comfort food with a little finesse. I’m here for mac, stews, and big flavors.", city: "Raleigh, NC", dietary_tags: ["halal"], recipe_count: 3 },
    { email: "chef14@flavur.app", username: "Isabella Rossi", full_name: "Isabella Rossi", bio: "Italian-American classics + quick upgrades. Pasta night is a lifestyle.", city: "Raleigh, NC", dietary_tags: [], recipe_count: 4 },
    { email: "chef15@flavur.app", username: "Grace Lee", full_name: "Grace Lee", bio: "Vegetarian but never boring. Textures matter. Crunch is mandatory.", city: "Raleigh, NC", dietary_tags: ["vegetarian"], recipe_count: 3 },
    { email: "chef16@flavur.app", username: "Noah Simmons", full_name: "Noah Simmons", bio: "I cook for friends, roommates, whoever’s nearby. Big batches, bigger vibes.", city: "Raleigh, NC", dietary_tags: [], recipe_count: 3 },
    { email: "chef17@flavur.app", username: "Zara Khan", full_name: "Zara Khan", bio: "Halal meals + meal prep. I keep it flavorful and realistic.", city: "Raleigh, NC", dietary_tags: ["halal"], recipe_count: 4 },
    { email: "chef18@flavur.app", username: "Ananya Deshmukh", full_name: "Ananya Deshmukh", bio: "I like clean ingredients but I’m not a robot. Tacos and stir-fry forever.", city: "Raleigh, NC", dietary_tags: [], recipe_count: 3 },

    // San Francisco (5)
    { email: "chef19@flavur.app", username: "Avery Chen", full_name: "Avery Chen", bio: "SF meal prep + farmers market haul energy. Simple, seasonal, fast.", city: "San Francisco, CA", dietary_tags: ["vegan"], recipe_count: 4 },
    { email: "chef20@flavur.app", username: "Leo Martinez", full_name: "Leo Martinez", bio: "Fusion experiments that somehow work. I’m chasing the perfect bite.", city: "San Francisco, CA", dietary_tags: [], recipe_count: 3 },
    { email: "chef21@flavur.app", username: "Ishani Vyas", full_name: "Ishani Vyas", bio: "Minimalist cooking. Big on broth, noodles, and clean flavors.", city: "San Francisco, CA", dietary_tags: ["vegetarian"], recipe_count: 3 },
    { email: "chef22@flavur.app", username: "Morgan Blake", full_name: "Morgan Blake", bio: "High-protein meals that don’t taste like cardboard. Sauces save lives.", city: "San Francisco, CA", dietary_tags: [], recipe_count: 4 },
    { email: "chef23@flavur.app", username: "Nadia El-Amin", full_name: "Nadia El-Amin", bio: "Halal-friendly and spice-forward. I’ll make you love chickpeas.", city: "San Francisco, CA", dietary_tags: ["halal"], recipe_count: 3 },

    // Los Angeles (2)
    { email: "chef24@flavur.app", username: "Jules Harper", full_name: "Jules Harper", bio: "LA food obsession: street tacos, bowls, and anything with hot sauce.", city: "Los Angeles, CA", dietary_tags: [], recipe_count: 4 },
    { email: "chef25@flavur.app", username: "Arjun Rao", full_name: "Arjun Rao", bio: "Plant-forward LA-style. Fresh, colorful, and actually filling.", city: "Los Angeles, CA", dietary_tags: ["vegan"], recipe_count: 5 },
  ];

  // --- Create users + profiles ---
  const createdUsers: { id: string; plan: SeedUserPlan }[] = [];

  for (const plan of plans) {
    console.log(`\n👤 Creating auth user: ${plan.email}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: plan.email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: plan.full_name, is_seed_user: true },
    });
    if (error) throw error;

    const userId = data.user.id;
    createdUsers.push({ id: userId, plan });

    console.log(`   ✅ auth.users id = ${userId}`);
    console.log(`   🧾 inserting profile...`);

    // Insert profile (you said you probably do it manually; script will do it)
    const avatar_url = pick(AVATAR_IMAGES);

    const { error: profErr } = await supabase.from("profiles").upsert({
        id: userId,
        username: plan.username,
        full_name: plan.full_name,
        bio: plan.bio,
        avatar_url,
        dietary_tags: plan.dietary_tags,
        location_city: plan.city,
        location: plan.city,
        is_seed_user: true,
    } as any);


    if (profErr) throw profErr;
  }

  // --- Create recipes + ingredients + steps ---
  const allRecipeIds: number[] = [];

  for (const u of createdUsers) {
    console.log(`\n🍽 Creating recipes for ${u.plan.full_name} (${u.plan.city}) tags=${JSON.stringify(u.plan.dietary_tags)}`);

    for (let i = 0; i < u.plan.recipe_count; i++) {
      // Decide a diet for this recipe, influenced by user tags
      const userPrimaryDiet = u.plan.dietary_tags[0] || "none";
      const diet =
        faker.number.int({ min: 1, max: 100 }) <= 70
          ? userPrimaryDiet
          : pick(DIETS);

      const r = generateRecipe(diet);

      const created_at = randomDatePast30Days();

      const { data: recipeRow, error: recipeErr } = await supabase
        .from("recipes")
        .insert({
          user_id: u.id,
          title: r.title,
          caption: r.caption,
          description: r.description,
          image_url: r.image_url,
          created_at,
          is_seed_data: true,
          is_public: true,
        } as any)
        .select("id")
        .single();

      if (recipeErr) throw recipeErr;

      const recipeId = recipeRow.id as number;
      allRecipeIds.push(recipeId);

      // Steps
      const stepRows = r.steps.map((s) => ({
        recipe_id: recipeId,
        position: s.position,
        body: s.body,
        timer_seconds: s.timer_seconds,
      }));

      const { error: stepErr } = await supabase.from("recipe_steps").insert(stepRows as any);
      if (stepErr) throw stepErr;

      // Ingredients (random existing ingredients)
      const used = new Set<number>();
      const ingredientRows: any[] = [];

      for (let p = 1; p <= r.ingredientsSpec; p++) {
        let ing = pick(ingredientIds);
        while (used.has(ing) && used.size < ingredientIds.length) ing = pick(ingredientIds);
        used.add(ing);

        const unit = faker.helpers.maybe(() => pick(unitCodes), { probability: 0.75 }) ?? null;

        ingredientRows.push({
          recipe_id: recipeId,
          ingredient_id: ing,
          quantity: faker.helpers.maybe(() => faker.number.float({ min: 0.25, max: 4, fractionDigits: 2 }), { probability: 0.85 }) ?? null,
          unit_code: unit,
          notes: faker.helpers.maybe(() => pick(r.ingredientNotes), { probability: 0.5 }) ?? null,
          position: p,
        });
      }

      const { error: ingErr } = await supabase.from("recipe_ingredients").insert(ingredientRows);
      if (ingErr) throw ingErr;

      console.log(`   ✅ recipe ${recipeId}: ${r.title}`);
    }
  }

  // --- Likes + Comments (make it feel real) ---
  // Pick "popular" recipes and add interactions from other seed users
  console.log("\n🔥 Adding likes/comments to popular recipes...");

  const seedUserIds = createdUsers.map((x) => x.id);

  // Choose ~40% of recipes to be "popular"
  const popular = faker.helpers.shuffle(allRecipeIds).slice(0, Math.floor(allRecipeIds.length * 0.4));

  for (const recipeId of popular) {
    const likeCount = faker.number.int({ min: 3, max: 18 });
    const commentCount = faker.number.int({ min: 1, max: 5 });

    const likers = faker.helpers.shuffle(seedUserIds).slice(0, likeCount);

    // Insert likes
    const likeRows = likers.map((uid) => ({
      user_id: uid,
      recipe_id: recipeId,
      created_at: randomDatePast30Days(),
      is_seed_data: true,
    }));

    // If your likes table has a unique constraint (user_id, recipe_id), this is safe already.
    const { error: likeErr } = await supabase.from("likes").upsert(likeRows as any, { onConflict: "user_id,recipe_id" });
    if (likeErr) throw likeErr;

    // Insert comments
    const commenters = faker.helpers.shuffle(seedUserIds).slice(0, commentCount);
    const commentBodies = [
      "Made this tonight — honestly so good.",
      "The sauce is the best part. Saving this one.",
      "Quick and flavorful. Exactly what I needed.",
      "I added extra garlic and it was perfect.", 
      "This is going into my weekly rotation.",
      "Loved it. Next time I'm doubling the batch.",
    ];

    const commentRows = commenters.map((uid) => ({
      user_id: uid,
      recipe_id: recipeId,
      body: pick(commentBodies),
      created_at: randomDatePast30Days(),
      is_seed_data: true,
    }));

    const { error: cErr } = await supabase.from("comments").insert(commentRows as any);
    if (cErr) throw cErr;
  }

  console.log("\n✅ DONE. Seed users + recipes + likes/comments created.");
  console.log("Next: upload images to Supabase Storage using the seed/ paths, or update image_url later.");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});

 