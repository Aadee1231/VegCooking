import { config } from "dotenv";
config({ path: "./scripts/seed/.env.seed" });

import { createClient } from "@supabase/supabase-js";

console.log("Environment check:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✓" : "✗");
console.log("SEED_PASSWORD:", process.env.SEED_PASSWORD ? "✓" : "✗");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SEED_PASSWORD = process.env.SEED_PASSWORD;

// Generate 25 unique users with diverse dietary preferences
const usersData = [
{
    email: "meatlover.mike@email.com",
    display_name: "Mike Johnson",
    username: "meatlover_mike",
    location: "Charlotte, NC",
    bio: "BBQ enthusiast and grill master. Nothing beats a perfectly smoked brisket!",
    tags: ["non-vegetarian", "bbq", "grilling", "meat-lover"],
  },
  {
    email: "vegan.victoria@email.com",
    display_name: "Victoria Chen",
    username: "victoria_eats_plants",
    location: "Charlotte, NC",
    bio: "Plant-based chef passionate about creating delicious vegan meals that everyone will love.",
    tags: ["vegan", "plant-based", "healthy", "sustainable"],
  }, 
  {
    email: "halal.hassan@email.com",
    display_name: "Hassan Rahman",  
    username: "hassan_cooks_halal",
    location: "Charlotte, NC",
    bio: "Traditional halal cooking with a modern twist. Sharing family recipes passed down through generations.",
    tags: ["halal", "traditional", "family-recipes", "middle-eastern"],
  },
  {
    email: "vegetarian.valerie@email.com",
    display_name: "Valerie Martinez",
    username: "valerie_veggie_adventures",
    location: "San Diego, CA",
    bio: "Vegetarian foodie exploring global cuisines. Believe veggies can be the star of any meal!",
    tags: ["vegetarian", "global-cuisine", "healthy", "colorful"],
  },
  {
    email: "fish.frank@email.com",
    display_name: "Frank Thompson",
    username: "frank_catches_fish",
    location: "Charlotte, NC",
    bio: "Pescatarian living in the Pacific Northwest. Fresh seafood is my passion!",
    tags: ["pescatarian", "seafood", "pacific-northwest", "fresh"],
  },
  {
    email: "keto.katie@email.com",
    display_name: "Katie Wilson",
    username: "katie_lives_keto",
    location: "Charlotte, NC",
    bio: "Low-carb lifestyle advocate. Making keto delicious and sustainable one recipe at a time.",
    tags: ["keto", "low-carb", "high-protein", "weight-loss"],
  },
  {
    email: "mediterranean.maria@email.com",
    display_name: "Maria Rodriguez",
    username: "maria_mediterranean_kitchen",
    location: "Raleigh, NC",
    bio: "Bringing the flavors of the Mediterranean to your kitchen. Olive oil is life!",
    tags: ["mediterranean", "healthy-fats", "olive-oil", "fresh-herbs"],
  },
  {
    email: "spicy.samuel@email.com",
    display_name: "Samuel Lee",
    username: "sam_loves_heat",
    location: "Raleigh, NC",
    bio: "Heat seeker and flavor chaser. If it's not spicy, it's not worth eating!",
    tags: ["spicy", "hot-sauce", "chili", "bold-flavors"],
  },
  {
    email: "gluten.free.gina@email.com",
    display_name: "Gina Foster",
    username: "gina_bakes_glutenfree",
    location: "Raleigh, NC",
    bio: "Gluten-free baker and chef. Celiac disease won't stop me from enjoying amazing food!",
    tags: ["gluten-free", "baking", "celiac-friendly", "allergy-aware"],
  },
  {
    email: "comfort.food.carl@email.com",
    display_name: "Carl Anderson",
    username: "carl_comfort_foodie",
    location: "Raleigh, NC",
    bio: "Southern comfort food specialist. Everything tastes better with butter and love!",
    tags: ["comfort-food", "southern", "homestyle", "hearty"],
  },
  {
    email: "raw.food.rachel@email.com",
    display_name: "Rachel Green",
    username: "rachel_raw_fresh",
    location: "Los Angeles, CA",
    bio: "Raw food enthusiast. Eating clean and living green, one uncooked meal at a time.",
    tags: ["raw-food", "uncooked", "clean-eating", "detox"],
  },
  {
    email: "halal.huda@email.com",
    display_name: "Huda Ahmed",
    username: "huda_halal_eats_nyc",
    location: "New York, NY",
    bio: "Halal food blogger exploring NYC's best halal spots and creating my own recipes.",
    tags: ["halal", "food-blogger", "nyc-eats", "street-food"],
  },
  {
    email: "paleo.peter@email.com",
    display_name: "Peter Mitchell",
    username: "peter_paleo_lifestyle",
    location: "Raleigh, NC",
    bio: "Paleo lifestyle coach. Eating like our ancestors for modern health benefits.",
    tags: ["paleo", "ancestral-diet", "crossfit", "high-protein"],
  },
  {
    email: "dairy.free.diana@email.com",
    display_name: "Diana Kumar",
    username: "diana_dairyfree_delights",
    location: "Raleigh, NC",
    bio: "Dairy-free recipe developer. Making creamy, delicious meals without any dairy!",
    tags: ["dairy-free", "lactose-intolerant", "plant-based-creamy", "allergy-friendly"],
  },
  {
    email: "bbq.brian@email.com",
    display_name: "Brian Cooper",
    username: "brian_bbq_master",
    location: "Raleigh, NC",
    bio: "Competition BBQ pitmaster. Low and slow is the only way to go!",
    tags: ["bbq", "competition", "smoking", "ribs"],
  },
  {
    email: "mediterranean.mona@email.com",
    display_name: "Mona Al-Farsi",
    username: "mona_mediterranean_soul",
    location: "San Francisco, CA",
    bio: "Halal Mediterranean cooking. Bringing authentic flavors from my grandmother's kitchen.",
    tags: ["halal", "mediterranean", "authentic", "family-recipes"],
  },
  {
    email: "vegetarian.veggie.vanessa@email.com",
    display_name: "Vanessa Park",
    username: "vanessa_farm_table",
    location: "San Francisco, CA",
    bio: "Farm-to-table vegetarian chef. Supporting local farmers and creating seasonal dishes.",
    tags: ["vegetarian", "farm-to-table", "seasonal", "local-produce"],
  },
  {
    email: "protein.paul@email.com",
    display_name: "Paul Rodriguez",
    username: "paul_protein_gains",
    location: "San Francisco, CA",
    bio: "Fitness enthusiast and high-protein meal prep expert. Gains are made in the kitchen!",
    tags: ["high-protein", "meal-prep", "fitness", "bodybuilding"],
  },
  {
    email: "vegan.baker.victoria@email.com",
    display_name: "Victoria Sweet",
    username: "victoria_sweet_vegan",
    location: "San Francisco, CA",
    bio: "Vegan pastry chef proving that desserts can be compassionate and delicious!",
    tags: ["vegan", "baking", "desserts", "compassionate-cooking"],
  },
  {
    email: "halal.grill.hassan@email.com",
    display_name: "Hassan Malik",
    username: "hassan_halal_grillz",
    location: "San Francisco, CA",
    bio: "Halal grill master. Perfecting the art of halal BBQ and grilling techniques.",
    tags: ["halal", "grilling", "bbq", "halal-bbq"],
  },
  {
    email: "comfort.veggie.chloe@email.com",
    display_name: "Chloe Martinez",
    username: "chloe_cozy_veggie",
    location: "San Francisco, CA",
    bio: "Vegetarian comfort food creator. Who says healthy food can't be cozy?",
    tags: ["vegetarian", "comfort-food", "cozy", "healthy-comfort"],
  },
  {
    email: "wild.game.william@email.com",
    display_name: "William Hunter",
    username: "william_wild_game",
    location: "San Francisco, CA",
    bio: "Hunter and wild game cook. From field to plate, knowing where your food comes from.",
    tags: ["wild-game", "hunting", "field-to-plate", "sustainable-meat"],
  },
  {
    email: "raw.vegan.ruby@email.com",
    display_name: "Ruby Johnson",
    username: "ruby_raw_energy",
    location: "San Francisco, CA",
    bio: "Raw vegan lifestyle coach. Energizing your life through living foods!",
    tags: ["raw-vegan", "living-foods", "detox", "high-energy"],
  },
  {
    email: "halal.traditional.tariq@email.com",
    display_name: "Tariq Hassan",
    username: "tariq_traditional_cooks",
    location: "San Francisco, CA",
    bio: "Traditional halal home cook. Preserving authentic recipes from the old country.",
    tags: ["halal", "traditional", "authentic", "heritage-cooking"],
  },
  {
    email: "vegetarian.athlete.alex@email.com",
    display_name: "Alex Kim",
    username: "alex_plant_athlete",
    location: "San Francisco, CA",
    bio: "Vegetarian athlete proving that plant power fuels champion performance!",
    tags: ["vegetarian", "athlete", "plant-power", "sports-nutrition"],
  },
  {
    email: "carnivore.chris@email.com",
    display_name: "Chris Stone",
    username: "chris_meat_fuel",
    location: "San Francisco, CA",
    bio: "Carnivore diet enthusiast. Meat is medicine and fat is fuel!",
    tags: ["carnivore", "meat-only", "zero-carb", "animal-based"],
  }
];

async function seedUsers() {
  console.log(`🌱 Starting to seed ${usersData.length} users...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const user of usersData) {
    try {
      // Create user in auth.users table
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: user.display_name,
          username: user.username,
          location: user.location,
          bio: user.bio,
          tags: user.tags,
        },
        app_metadata: {
          role: 'user'
        }
      });

      if (authError) {
        console.error(`❌ Error creating user ${user.email}:`, authError.message);
        errorCount++;
        continue;
      }

      // Also create profile in public.profiles table if it exists
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: user.username,
          display_name: user.display_name,
          location: user.location,
          bio: user.bio,
          tags: user.tags,
          dietary_preference: user.dietary_preference,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn(`⚠️ Warning: Could not create profile for ${user.email}:`, profileError.message);
        // Don't count as error since auth user was created successfully
      }

      console.log(`✅ Created user: ${user.display_name} (@${user.username})`);
      successCount++;

    } catch (error) {
      console.error(`❌ Unexpected error for ${user.email}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 User seeding complete!`);
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed to create: ${errorCount} users`);
  
  if (successCount > 0) {
    console.log(`\n📝 All seed users can login with password: ${SEED_PASSWORD}`);
  }
}

seedUsers().catch(console.error);
