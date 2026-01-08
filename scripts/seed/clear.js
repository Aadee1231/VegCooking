import { config } from "dotenv";
config({ path: "./scripts/seed/.env.seed" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = process.env.SEED_USER_ID;

async function clearExistingData() {
  console.log("🧹 Clearing existing seed data...");
  
  // Get all recipe IDs for this user first
  const { data: recipes, error: fetchError } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", USER_ID);
  
  if (fetchError) {
    console.error("❌ Error fetching recipes:", fetchError);
    throw fetchError;
  }
  
  const recipeIds = recipes?.map(r => r.id) || [];
  console.log(`Found ${recipeIds.length} recipes to clear`);
  
  if (recipeIds.length === 0) {
    console.log("✅ No existing data to clear");
    return;
  }
  
  // Delete from recipe_ingredients first (due to foreign key constraints)
  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .in("recipe_id", recipeIds);
  
  if (ingredientsError) {
    console.error("❌ Error clearing recipe_ingredients:", ingredientsError);
    throw ingredientsError;
  }
  
  // Delete from recipe_steps
  const { error: stepsError } = await supabase
    .from("recipe_steps")
    .delete()
    .in("recipe_id", recipeIds);
  
  if (stepsError) {
    console.error("❌ Error clearing recipe_steps:", stepsError);
    throw stepsError;
  }
  
  // Delete from recipes
  const { error: recipesError } = await supabase
    .from("recipes")
    .delete()
    .eq("user_id", USER_ID);
  
  if (recipesError) {
    console.error("❌ Error clearing recipes:", recipesError);
    throw recipesError;
  }
  
  console.log("✅ Cleared existing data");
}

clearExistingData().catch(console.error);
