import { config } from "dotenv";
config({ path: "./scripts/seed/.env.seed" });

import { createClient } from "@supabase/supabase-js";

console.log("Environment check:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✓" : "✗");
console.log("SEED_USER_ID:", process.env.SEED_USER_ID ? "✓" : "✗");

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

async function seed() {
  console.log("🌱 Seeding recipes...");
  
  // Load the appropriate recipes for this user
  const RECIPES = await loadRecipes();
  console.log(`📋 Found ${RECIPES.length} recipes to seed`);

  for (const recipe of RECIPES) {
    const { data: recipeRow, error } = await supabase
      .from("recipes")
      .insert({
        user_id: USER_ID,
        title: recipe.title,
        caption: recipe.caption,
        description: recipe.description,
        servings: recipe.servings,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        is_public: true,
      })
      .select()
      .single();

    if (error) throw error;

    const recipeId = recipeRow.id;

    // First, create or find ingredients
    const ingredientIds = [];
    for (const ingredient of recipe.ingredients) {
      // Check if ingredient already exists
      const { data: existingIngredient, error: checkError } = await supabase
        .from("ingredients")
        .select("id")
        .eq("name", ingredient.name)
        .single();
      
      let ingredientId;
      if (checkError && checkError.code === 'PGRST116') {
        // No existing ingredient found, create new one
        console.log(`  Creating new ingredient: ${ingredient.name}`);
        const { data: newIngredient, error: createError } = await supabase
          .from("ingredients")
          .insert({
            name: ingredient.name
          })
          .select()
          .single();
        
        if (createError) {
          console.error("❌ Error creating ingredient:", createError);
          throw createError;
        }
        
        ingredientId = newIngredient.id;
      } else if (existingIngredient) {
        console.log(`  Using existing ingredient: ${ingredient.name}`);
        ingredientId = existingIngredient.id;
      } else {
        console.error("❌ Unexpected error checking ingredient:", checkError);
        throw checkError;
      }
      
      ingredientIds.push(ingredientId);
    }

    // Now link ingredients to recipe
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(
        recipe.ingredients.map((ingredient, index) => {
          let quantityValue = null;
          if (ingredient.quantity && ingredient.quantity !== "to taste" && ingredient.quantity !== "optional") {
            // Handle common fraction formats
            if (ingredient.quantity.includes('/')) {
              const parts = ingredient.quantity.split('/');
              if (parts.length === 2) {
                const num = parseFloat(parts[0]);
                const den = parseFloat(parts[1]);
                if (!isNaN(num) && !isNaN(den) && den !== 0) {
                  quantityValue = num / den;
                }
              }
            } else {
              const parsed = parseFloat(ingredient.quantity);
              if (!isNaN(parsed)) {
                quantityValue = parsed;
              }
            }
          }
          
          return {
            recipe_id: recipeId,
            ingredient_id: ingredientIds[index],
            quantity: quantityValue,
            position: index + 1,
          };
        })
      );

    if (ingredientsError) {
      console.error("❌ Ingredients error:", ingredientsError);
      throw ingredientsError;
    }

    // Insert steps
    const { data: stepsData, error: stepsError } = await supabase
      .from("recipe_steps")
      .insert(
        recipe.steps.map((step, index) => ({
          recipe_id: recipeId,
          position: index + 1,
          body: step,
        }))
      );

    if (stepsError) {
      console.error("❌ Steps error:", stepsError);
      throw stepsError;
    }

    console.log(`  📝 Inserted ${recipe.ingredients.length} ingredients`);
    console.log(`  📋 Inserted ${recipe.steps.length} steps`);

    console.log(`✅ Seeded: ${recipe.title}`);
  }

  console.log("🎉 DONE");
}

seed().catch(console.error);
