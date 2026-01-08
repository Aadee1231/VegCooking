import { config } from "dotenv";
config({ path: "./scripts/seed/.env.seed" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = process.env.SEED_USER_ID;

// Dynamically load recipes based on user ID
async function loadRecipes() {
  const ADMIN_USER_ID = "6e1cbfe7-fc5b-47f5-9374-26e69eacc538"; // Original admin account
  
  if (USER_ID === ADMIN_USER_ID) {
    console.log("📂 Loading admin recipes...");
    const { RECIPES } = await import("./seedRecipes_admin.js");
    return RECIPES;
  } else {
    console.log("📂 Loading user recipes...");
    const { RECIPES } = await import("./seedRecipes_user.js");
    return RECIPES;
  }
}

async function listRecipes() {
  console.log("📋 Current recipes for user:", USER_ID);
  
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, caption, created_at")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("❌ Error fetching recipes:", error);
    return;
  }
  
  console.log(`Found ${recipes?.length || 0} recipes:`);
  recipes?.forEach((recipe, index) => {
    console.log(`${index + 1}. ${recipe.title} (ID: ${recipe.id})`);
    console.log(`   Caption: ${recipe.caption || 'None'}`);
    console.log(`   Created: ${new Date(recipe.created_at).toLocaleString()}`);
    console.log('');
  });
}

async function deleteRecipe(recipeId) {
  console.log(`🗑️ Deleting recipe ID: ${recipeId}`);
  
  // Delete from recipe_ingredients first
  await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);
  
  // Delete from recipe_steps
  await supabase
    .from("recipe_steps")
    .delete()
    .eq("recipe_id", recipeId);
  
  // Delete the recipe
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId);
  
  if (error) {
    console.error("❌ Error deleting recipe:", error);
  } else {
    console.log("✅ Recipe deleted successfully");
  }
}

async function showAvailableRecipes() {
  console.log("📖 Available recipes in current user's file:");
  
  const RECIPES = await loadRecipes();
  console.log(`Found ${RECIPES.length} recipes in file:`);
  
  RECIPES.forEach((recipe, index) => {
    console.log(`${index + 1}. ${recipe.title}`);
    console.log(`   Caption: ${recipe.caption || 'None'}`);
    console.log(`   Difficulty: ${recipe.difficulty || 'Not set'}`);
    console.log(`   Tags: ${recipe.tags?.join(', ') || 'None'}`);
    console.log('');
  });
}

// Command line interface
const command = process.argv[2];
const recipeId = process.argv[3];

switch (command) {
  case 'list':
    await listRecipes();
    break;
  case 'delete':
    if (!recipeId) {
      console.error("❌ Please provide a recipe ID: node manage.js delete <recipe-id>");
    process.exit(1);
    }
    await deleteRecipe(parseInt(recipeId));
    break;
  case 'show-available':
    await showAvailableRecipes();
    break;
  default:
    console.log("📖 Recipe Management Commands:");
    console.log("");
    console.log("List current recipes in database:");
    console.log("  node manage.js list");
    console.log("");
    console.log("Show available recipes in current user's file:");
    console.log("  node manage.js show-available");
    console.log("");
    console.log("Delete a specific recipe:");
    console.log("  node manage.js delete <recipe-id>");
    console.log("");
    console.log("Seed/update recipes:");
    console.log("  node seed.js");
    break;
}
