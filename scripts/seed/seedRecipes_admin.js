  /**
   * @type {import('./seedRecipes').Recipe[]}
   * 
   * Just run "node scripts/seed/seed.js" in Flavur/ root directory and it will update
   * seed recipes that have been editied since last seed push. Recipes will update based
   * on similar title and user_id.
   * 
   * For adding recipes on this same account (admin AadeeC account), just add it at the bottom,
   * make sure to put commas, and it will automatically update the seed. 
   * 
   * For adding recipes on a different account, change the SEED_USER_ID 
   * in scripts/seed/.env.seed file.
   * 
   * For the manage file here are the commands:
   * 
   * List current recipes -  
   * node scripts/seed/manage.js list
   * 
   * Delete specific recipe (get ID from list command first) - 
   * node scripts/seed/manage.js delete 123
   * 
   * Seed/update recipes (your main workflow) - 
   * node scripts/seed/seed.js
   * 
   */
  export const RECIPES = [
    {
      title: "Creamy Banana Peanut Butter Oatmeal",
      caption: "Cozy, filling, naturally sweet",
      description:
        "Warm oatmeal made extra creamy with peanut butter and ripe banana—simple, comforting, and beginner-friendly.",
      servings: 1,
      prep_time: "5 min",
      cook_time: "10 min",
      difficulty: "Easy",
      tags: ["Vegan", "Breakfast", "Dairy-Free", "Healthy", "Quick"],

      ingredients: [
        { name: "Rolled oats", quantity: "1/2", unit: "cup" },
        { name: "Plant milk", quantity: "1", unit: "cup" },
        { name: "Banana", quantity: "1", unit: "" },
        { name: "Peanut butter", quantity: "1", unit: "tbsp" },
        { name: "Cinnamon", quantity: "1/2", unit: "tsp" },
        { name: "Salt", quantity: "pinch", unit: "" },
      ],

      steps: [
        "Prepare everything before turning on the stove. Grab a small saucepan, a stirring spoon, and a bowl to eat from. Measure out the oats and plant milk so you are not rushing while cooking.",
        "Place the saucepan on the stove over medium heat. Add the oats, plant milk, cinnamon, and a pinch of salt. Stir immediately so the oats do not stick to the bottom of the pan.",
        "Let the mixture slowly heat up. After about 2–3 minutes, you should see small bubbles forming around the edges. This is a gentle simmer. If it begins boiling aggressively, reduce the heat slightly.",
        "While the oats cook, peel the banana. Break off about half of it and mash it thoroughly in a bowl using a fork until it becomes soft and creamy.",
        "Stir the oats every 20–30 seconds to prevent sticking. As the oats cook, they will thicken from a soupy consistency into a creamy porridge. If it becomes too thick too quickly, add a splash of plant milk.",
        "Once the oats are soft and tender (taste one to check), stir in the mashed banana and continue cooking for one more minute.",
        "Turn off the heat and remove the pot from the stove. Add the peanut butter and stir until it melts completely into the oatmeal, creating a smooth and creamy texture.",
        "Pour the oatmeal into a bowl. Slice the remaining banana and place it on top. Let it sit for one minute to thicken slightly, then serve warm.",
      ],
    },

    {
      title: "Avocado Chickpea Breakfast Toast",
      caption: "Savory, filling, protein-packed",
      description:
        "Chunky mashed chickpeas and creamy avocado spread over crisp toast with lemon and seasoning.",
      servings: 2,
      prep_time: "10 min",
      cook_time: "5 min",
      difficulty: "Easy",
      tags: ["Vegan", "Breakfast", "Healthy", "Quick"],

      ingredients: [
        { name: "Bread", quantity: "2", unit: "slices" },
        { name: "Canned chickpeas", quantity: "1/2", unit: "cup" },
        { name: "Avocado", quantity: "1", unit: "" },
        { name: "Lemon juice", quantity: "1", unit: "tbsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
        { name: "Black pepper", quantity: "to taste", unit: "" },
        { name: "Chili flakes", quantity: "optional", unit: "" },
      ],

      steps: [
        "Toast the bread first so it becomes sturdy enough to hold the topping. Toast until golden brown and crisp, not pale.",
        "Drain and rinse the chickpeas under cold water for about 10 seconds to remove the canned flavor. Shake off excess water.",
        "Place chickpeas in a bowl and mash them with a fork until mostly broken down but still chunky. Avoid turning them into a paste.",
        "Cut the avocado in half lengthwise, remove the pit carefully, and scoop the flesh into the bowl with the chickpeas.",
        "Add lemon juice, salt, and black pepper. Mash and mix everything together until creamy but textured. Taste and adjust seasoning.",
        "Spread the mixture evenly over the toasted bread, making sure to reach the edges for even bites.",
        "Sprinkle chili flakes on top if you want heat. Serve immediately while toast is crisp.",
      ],
    },

    {
      title: "Rainbow Quinoa Veggie Bowl",
      caption: "Fresh, colorful, and energizing",
      description:
        "Quinoa topped with roasted vegetables and a creamy lemon tahini dressing for a balanced plant-based lunch.",
      servings: 2,
      prep_time: "15 min",
      cook_time: "25 min",
      difficulty: "Medium",
      tags: ["Vegan", "Lunch", "Healthy", "Gluten-Free"],

      ingredients: [
        { name: "Cooked quinoa", quantity: "1", unit: "cup" },
        { name: "Zucchini", quantity: "1", unit: "" },
        { name: "Red bell pepper", quantity: "1", unit: "" },
        { name: "Broccoli florets", quantity: "1", unit: "cup" },
        { name: "Olive oil", quantity: "2", unit: "tbsp" },
        { name: "Tahini", quantity: "2", unit: "tbsp" },
        { name: "Lemon juice", quantity: "1", unit: "tbsp" },
        { name: "Water", quantity: "2", unit: "tbsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
        { name: "Black pepper", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Preheat the oven to 400°F / 205°C and allow it to fully heat so vegetables roast properly instead of steaming.",
        "Wash all vegetables thoroughly. Slice the zucchini into half-moons, chop the bell pepper into bite-sized pieces, and cut broccoli into evenly sized florets.",
        "Place vegetables on a baking sheet, drizzle with olive oil, and sprinkle with salt and pepper. Toss well and spread into a single layer.",
        "Roast vegetables for 20–25 minutes, flipping halfway through. They are done when tender with lightly browned edges.",
        "If quinoa is not already cooked, rinse dry quinoa under water, then cook with a 1:2 ratio of quinoa to water until fluffy.",
        "Prepare the dressing by whisking tahini and lemon juice together. Add water one tablespoon at a time until smooth and pourable. Season with salt.",
        "Assemble bowls by adding quinoa first, then roasted vegetables. Drizzle dressing evenly over the top and serve.",
      ],
    },

    {
      title: "Vegan Chickpea Salad Sandwich",
      caption: "Creamy, tangy, classic lunch",
      description:
        "A plant-based chickpea salad that mimics a classic deli sandwich filling.",
      servings: 2,
      prep_time: "10 min",
      cook_time: "0 min",
      difficulty: "Easy",
      tags: ["Vegan", "Lunch", "Quick", "Comfort Food"],

      ingredients: [
        { name: "Canned chickpeas", quantity: "1", unit: "can" },
        { name: "Vegan mayo", quantity: "3", unit: "tbsp" },
        { name: "Mustard", quantity: "1", unit: "tbsp" },
        { name: "Celery", quantity: "1", unit: "stalk" },
        { name: "Salt", quantity: "to taste", unit: "" },
        { name: "Black pepper", quantity: "to taste", unit: "" },
        { name: "Bread", quantity: "for serving", unit: "" },
      ],

      steps: [
        "Drain and rinse chickpeas thoroughly, then let them sit in a strainer for one minute so excess water drips away.",
        "Place chickpeas in a bowl and mash with a fork until mostly broken down but still chunky.",
        "Add vegan mayo and mustard, starting with smaller amounts and mixing well before adding more if needed.",
        "Finely dice the celery and stir it into the mixture for crunch.",
        "Season with salt and pepper, taste, and adjust seasoning until balanced.",
        "Spread the chickpea salad onto bread or wraps and serve immediately or chilled.",
      ],
    },

    {
      title: "Spicy Peanut Noodle Salad",
      caption: "Sweet heat with satisfying slurp",
      description:
        "Cold noodles tossed in a spicy peanut sauce with crunchy vegetables.",
      servings: 2,
      prep_time: "15 min",
      cook_time: "10 min",
      difficulty: "Medium",
      tags: ["Vegan", "Lunch", "Spicy"],

      ingredients: [
        { name: "Rice noodles", quantity: "6", unit: "oz" },
        { name: "Peanut butter", quantity: "2", unit: "tbsp" },
        { name: "Soy sauce", quantity: "1", unit: "tbsp" },
        { name: "Sriracha", quantity: "1", unit: "tbsp" },
        { name: "Sugar", quantity: "1", unit: "tsp" },
        { name: "Carrot", quantity: "1", unit: "" },
        { name: "Green onions", quantity: "2", unit: "" },
      ],

      steps: [
        "Bring a pot of water to a boil and cook noodles according to package instructions, stirring immediately to prevent sticking.",
        "Drain noodles and rinse under cold water to stop cooking and remove excess starch. Shake off excess water.",
        "In a bowl, whisk peanut butter, soy sauce, sriracha, and sugar until smooth. Add small splashes of water to thin if needed.",
        "Add noodles to a large bowl and pour sauce over them. Toss thoroughly so every noodle is coated.",
        "Julienne the carrot and slice green onions, then fold them into the noodles gently.",
        "Taste and adjust seasoning with more soy sauce or sriracha as desired. Serve chilled or at room temperature.",
      ],
    },

    {
      title: "Lentil & Tomato Soup",
      caption: "Hearty, cozy, nourishing",
      description:
        "Protein-packed lentil soup that is forgiving and beginner-friendly.",
      servings: 4,
      prep_time: "10 min",
      cook_time: "35 min",
      difficulty: "Medium",
      tags: ["Vegan", "Lunch", "Comfort Food", "Healthy"],

      ingredients: [
        { name: "Red lentils", quantity: "1", unit: "cup" },
        { name: "Onion", quantity: "1", unit: "" },
        { name: "Garlic", quantity: "2", unit: "cloves" },
        { name: "Diced tomatoes", quantity: "1", unit: "can" },
        { name: "Vegetable broth", quantity: "4", unit: "cups" },
        { name: "Olive oil", quantity: "1", unit: "tbsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
        { name: "Black pepper", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Rinse lentils thoroughly under running water until the water runs mostly clear.",
        "Heat olive oil in a pot over medium heat. Add diced onion and cook for 4–5 minutes until soft and translucent.",
        "Add garlic and stir for about 30 seconds until fragrant, being careful not to burn it.",
        "Add lentils, diced tomatoes with their juices, and vegetable broth. Stir well.",
        "Bring to a boil, then reduce heat to low and let simmer gently for 25–30 minutes, stirring occasionally.",
        "Season with salt and pepper near the end. Adjust consistency with extra broth if needed. Serve hot.",
      ],
    },

    {
      title: "Vegan Mushroom Stroganoff",
      caption: "Creamy comfort, zero dairy",
      description:
        "Mushrooms in a silky sauce served over pasta—rich and satisfying.",
      servings: 3,
      prep_time: "15 min",
      cook_time: "25 min",
      difficulty: "Medium",
      tags: ["Vegan", "Dinner", "Comfort Food"],

      ingredients: [
        { name: "Mushrooms", quantity: "8", unit: "oz" },
        { name: "Onion", quantity: "1", unit: "" },
        { name: "Garlic", quantity: "2", unit: "cloves" },
        { name: "Pasta", quantity: "8", unit: "oz" },
        { name: "Coconut milk", quantity: "1", unit: "cup" },
        { name: "Soy sauce", quantity: "1", unit: "tbsp" },
        { name: "Olive oil", quantity: "1", unit: "tbsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
        { name: "Black pepper", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Cook pasta first so timing is easy. Bring a large pot of water to a rolling boil. Add a big pinch of salt so the water tastes slightly salty. Add pasta, stir immediately so it doesn't stick, and cook according to package directions. Before draining, carefully scoop out about ½ cup of the starchy pasta water and set it aside. Drain the pasta and leave it nearby.",
        "Brown the mushrooms properly to build flavor. Place a large pan over medium-high heat and let it get hot before adding oil. Add olive oil, then add mushrooms in a single layer. Do not overcrowd the pan—cook in batches if needed. Leave mushrooms undisturbed for 2–3 minutes so they brown instead of steaming.",
        "Add the onion after mushrooms shrink and brown. Once mushrooms release their moisture and begin to brown, add sliced onion. Stir and cook for 4–5 minutes until onions soften and become translucent.",
        "Add garlic briefly so it doesn't burn. Add minced garlic and stir constantly for about 30 seconds, just until fragrant.",
        "Build the sauce slowly. Pour in coconut milk and soy sauce. Stir well to combine. Lower heat to medium-low and let the sauce gently simmer for 5–7 minutes until slightly thickened. If it thickens too much, add a splash of reserved pasta water.",
        "Season and combine. Taste the sauce and add salt and pepper as needed. Add cooked pasta directly into the pan and toss gently until every piece is coated. Let it sit 1–2 minutes so pasta absorbs sauce. Serve warm.",
      ],
    },

    {
      title: "Crispy Baked Tofu Stir-Fry",
      caption: "Crunchy tofu + saucy veggies",
      description:
        "Beginner-friendly method to get tofu crisp in the oven, then tossed with stir-fry veggies.",
      servings: 2,
      prep_time: "15 min",
      cook_time: "30 min",
      difficulty: "Medium",
      tags: ["Vegan", "Dinner", "Healthy"],

      ingredients: [
        { name: "Firm tofu", quantity: "1", unit: "block" },
        { name: "Soy sauce", quantity: "2", unit: "tbsp" },
        { name: "Oil", quantity: "1", unit: "tbsp" },
        { name: "Mixed vegetables", quantity: "2", unit: "cups" },
        { name: "Garlic", quantity: "optional", unit: "" },
        { name: "Ginger", quantity: "optional", unit: "" },
      ],

      steps: [
        "Press the tofu to remove water. Drain tofu, wrap it in paper towels or a clean towel, place it on a plate, and put something heavy on top (like a cutting board with books). Let it sit for 10 minutes to remove moisture.",
        "Preheat oven to 400°F / 205°C and line a baking sheet with parchment paper or lightly oil it to prevent sticking.",
        "Cut tofu into evenly sized ¾-inch cubes so they bake evenly. Too small makes them dry; too large keeps them soft.",
        "Season tofu gently. Place cubes in a bowl, add soy sauce and a small drizzle of oil, and toss carefully so the cubes don't break.",
        "Bake tofu properly. Spread cubes in a single layer with space between them. Bake for 25–30 minutes, flipping halfway at 15 minutes, until golden and firm.",
        "Cook vegetables. Heat a pan over medium-high heat with a teaspoon of oil. Add vegetables and stir-fry for 5–7 minutes until crisp-tender.",
        "Combine and serve. Add baked tofu to vegetables and toss for 1–2 minutes. Add extra soy sauce or quick sauce if desired. Serve hot with rice.",
      ],
    },

    {
      title: "Sweet Potato Black Bean Tacos",
      caption: "Smoky, filling taco night favorite",
      description:
        "Roasted sweet potatoes paired with seasoned black beans in warm tortillas.",
      servings: 3,
      prep_time: "15 min",
      cook_time: "30 min",
      difficulty: "Easy",
      tags: ["Vegan", "Dinner", "Spicy"],

      ingredients: [
        { name: "Sweet potatoes", quantity: "2", unit: "" },
        { name: "Black beans", quantity: "1", unit: "can" },
        { name: "Oil", quantity: "1", unit: "tbsp" },
        { name: "Taco seasoning", quantity: "2", unit: "tsp" },
        { name: "Tortillas", quantity: "for serving", unit: "" },
      ],

      steps: [
        "Preheat oven to 425°F / 220°C so sweet potatoes roast and caramelize properly.",
        "Peel sweet potatoes if desired, then cut into evenly sized ½-inch cubes.",
        "Place cubes on a baking sheet, drizzle with oil, sprinkle taco seasoning, and toss until evenly coated.",
        "Roast for 25–30 minutes, flipping halfway, until tender inside and browned on edges.",
        "Drain and rinse black beans, then warm them in a small pan over medium heat with a splash of water.",
        "Warm tortillas in a dry pan for 15–20 seconds per side until soft and flexible.",
        "Assemble tacos by adding sweet potatoes first, then beans. Add toppings if desired and serve immediately.",
      ],
    },

    {
      title: "Coconut Chickpea Curry",
      caption: "Rich, fragrant, comforting",
      description:
        "Chickpeas simmered in a creamy coconut curry sauce that is easy and forgiving.",
      servings: 4,
      prep_time: "10 min",
      cook_time: "30 min",
      difficulty: "Medium",
      tags: ["Vegan", "Dinner", "Spicy", "Comfort Food"],

      ingredients: [
        { name: "Onion", quantity: "1", unit: "" },
        { name: "Curry paste", quantity: "2", unit: "tbsp" },
        { name: "Chickpeas", quantity: "2", unit: "cans" },
        { name: "Coconut milk", quantity: "1", unit: "can" },
        { name: "Oil", quantity: "1", unit: "tbsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Heat oil in a pot over medium heat. Add diced onion and cook for 5–6 minutes until soft and lightly golden.",
        "Add curry paste and stir constantly for 30–60 seconds to toast the spices and release aroma.",
        "Slowly pour in coconut milk while stirring to create a smooth sauce.",
        "Add drained and rinsed chickpeas and stir well to coat them in sauce.",
        "Bring to a gentle simmer, then reduce heat to low and cook for 20–25 minutes, stirring occasionally.",
        "Season with salt to taste. Adjust thickness with water if needed. Serve warm over rice.",
      ],
    },

    {
      title: "Greek Yogurt Berry Parfait",
      caption: "Light, creamy, and refreshing",
      description:
          "A simple layered breakfast with creamy Greek yogurt, fresh berries, and crunchy granola.",
      servings: 1,
      prep_time: "5 min",
      cook_time: "0 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Breakfast", "Healthy", "Quick"],

      ingredients: [
          { name: "Greek yogurt", quantity: "1", unit: "cup" },
          { name: "Mixed berries", quantity: "1/2", unit: "cup" },
          { name: "Granola", quantity: "1/4", unit: "cup" },
          { name: "Honey", quantity: "optional", unit: "" },
      ],

      steps: [
          "Choose a bowl or jar depending on whether you are eating immediately or taking this on the go.",
          "Spoon half of the Greek yogurt into the bottom and spread it evenly so each bite starts creamy.",
          "Add half of the berries. If berries are large, slice them so they distribute evenly.",
          "Sprinkle half of the granola over the berries to add crunch.",
          "Repeat layers with remaining yogurt, berries, and granola.",
          "Taste and drizzle honey on top if desired. Serve immediately or refrigerate until ready to eat.",
      ],
    },

    {
      title: "Cinnamon Maple Ricotta Toast",
      caption: "Sweet, café-style breakfast",
      description:
          "Creamy ricotta spread on toast, finished with maple syrup and cinnamon.",
      servings: 2,
      prep_time: "5 min",
      cook_time: "5 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Breakfast", "Quick"],

      ingredients: [
          { name: "Bread", quantity: "2", unit: "slices" },
          { name: "Ricotta cheese", quantity: "1/2", unit: "cup" },
          { name: "Maple Syrup", quantity: "2", unit: "tsp" },
          { name: "Cinnamon", quantity: "1/4", unit: "tsp" },
          { name: "Salt", quantity: "pinch", unit: "" },
      ],

      steps: [
          "Toast bread until golden and crisp so it can support the ricotta without becoming soggy.",
          "Place ricotta in a bowl and stir for 10–15 seconds to make it smooth and spreadable.",
          "Add a tiny pinch of salt to the ricotta to enhance sweetness.",
          "Spread ricotta evenly over toast, reaching all edges.",
          "Drizzle honey lightly over the top and sprinkle cinnamon evenly.",
          "Serve immediately while toast is warm and crisp.",
      ],
    },

    {
      title: "Peanut Butter Banana Smoothie",
      caption: "Thick, creamy, and filling",
      description:
          "A quick smoothie that works as a complete breakfast with minimal prep.",
      servings: 1,
      prep_time: "5 min",
      cook_time: "0 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Breakfast", "Quick"],

      ingredients: [
          { name: "Banana", quantity: "1", unit: "" },
          { name: "Milk", quantity: "1", unit: "cup" },
          { name: "Peanut butter", quantity: "1", unit: "tbsp" },
          { name: "Ice", quantity: "optional", unit: "" },
      ],

      steps: [
          "Peel the banana and break it into chunks so it blends smoothly.",
          "Add milk to the blender first to help the blades move freely.",
          "Add banana pieces and peanut butter, followed by ice if using.",
          "Blend on low for a few seconds, then increase to high for 20–30 seconds until smooth.",
          "Check consistency and add more milk or ice as needed.",
          "Pour into a glass and drink immediately for best texture.",
      ],
    },

    {
      title: "Caprese Grilled Cheese",
      caption: "Melty mozzarella with fresh Italian flavors",
      description:
          "A grilled cheese upgraded with tomato and basil for a fresh twist.",
      servings: 1,
      prep_time: "5 min",
      cook_time: "10 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Lunch", "Comfort Food"],

      ingredients: [
          { name: "Bread", quantity: "2", unit: "slices" },
          { name: "Mozzarella", quantity: "4", unit: "slices" },
          { name: "Tomato", quantity: "2", unit: "slices" },
          { name: "Basil", quantity: "few", unit: "leaves" },
          { name: "Butter or oil", quantity: "1", unit: "tbsp" },
      ],

      steps: [
          "Slice tomato thinly and pat dry with paper towels to prevent sogginess.",
          "Heat a skillet over medium-low heat to allow cheese to melt slowly.",
          "Assemble sandwich with cheese, tomato, basil, and more cheese.",
          "Butter the outside of the bread evenly.",
          "Cook 4–5 minutes per side until golden brown and cheese is melted.",
          "Let rest for one minute, then slice and serve.",
      ],
    },

    {
      title: "Spinach & Cheese Quesadilla",
      caption: "Quick, cheesy, and comforting",
      description:
          "A crispy tortilla filled with sautéed spinach and melted cheese.",
      servings: 1,
      prep_time: "5 min",
      cook_time: "10 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Lunch", "Quick", "Comfort Food"],

      ingredients: [
          { name: "Tortilla", quantity: "1", unit: "large" },
          { name: "Shredded cheese", quantity: "1.5", unit: "cups" },
          { name: "Spinach", quantity: "2", unit: "cups" },
          { name: "Oil", quantity: "1", unit: "tsp" },
      ],

      steps: [
          "Heat oil in a pan over medium heat and add spinach.",
          "Cook spinach for 1–2 minutes until fully wilted, then remove excess moisture.",
          "Place tortilla in pan over medium-low heat and sprinkle cheese on one half.",
          "Add spinach, then more cheese, and fold tortilla closed.",
          "Cook 2–3 minutes per side until golden and crispy.",
          "Let rest briefly, then slice into wedges and serve.",
      ],
    },

    {
      title: "Tomato Basil Pasta",
      caption: "Simple Italian comfort",
      description:
          "Classic tomato sauce with garlic and basil tossed with pasta.",
      servings: 3,
      prep_time: "10 min",
      cook_time: "20 min",
      difficulty: "Medium",
      tags: ["Vegetarian", "Lunch", "Comfort Food"],

      ingredients: [
          { name: "Pasta", quantity: "10", unit: "oz" },
          { name: "Olive oil", quantity: "2", unit: "tbsp" },
          { name: "Garlic", quantity: "3", unit: "cloves" },
          { name: "Crushed tomatoes", quantity: "1", unit: "can" },
          { name: "Basil", quantity: "to taste", unit: "" },
          { name: "Salt", quantity: "to taste", unit: "" },
      ],

      steps: [
          "Boil pasta in salted water until al dente, then drain and reserve some pasta water.",
          "Heat olive oil in a pan over medium heat and add garlic until fragrant.",
          "Add tomatoes and simmer for 10–15 minutes.",
          "Season sauce with salt and basil.",
          "Toss cooked pasta with sauce, adding pasta water if needed.",
          "Serve warm with extra basil if desired.",
      ],
    },

    {
      title: "Cheese Stuffed Bell Peppers",
      caption: "Colorful, filling, and comforting",
      description:
          "Baked bell peppers stuffed with rice, sauce, and melty cheese.",
      servings: 4,
      prep_time: "15 min",
      cook_time: "40 min",
      difficulty: "Medium",
      tags: ["Vegetarian", "Dinner", "Comfort Food"],

      ingredients: [
          { name: "Bell peppers", quantity: "4", unit: "" },
          { name: "Cooked rice", quantity: "2", unit: "cups" },
          { name: "Marinara sauce", quantity: "1", unit: "cup" },
          { name: "Shredded cheese", quantity: "1.5", unit: "cups" },
      ],

      steps: [
          "Preheat oven to 375°F / 190°C.",
          "Cut tops off peppers and remove seeds and membranes.",
          "Pre-bake peppers for 10 minutes to soften.",
          "Mix rice, marinara, and half the cheese.",
          "Stuff peppers and top with remaining cheese.",
          "Bake covered for 20 minutes, uncover and bake 10 more minutes.",
          "Let cool slightly before serving.",
      ],
    },

    {
      title: "Creamy Mushroom Risotto",
      caption: "Rich, slow-cooked comfort",
      description:
          "Classic risotto with mushrooms and parmesan, cooked slowly for a creamy texture.",
      servings: 4,
      prep_time: "10 min",
      cook_time: "45 min",
      difficulty: "Hard",
      tags: ["Vegetarian", "Dinner", "Comfort Food"],

      ingredients: [
          { name: "Arborio rice", quantity: "1.5", unit: "cups" },
          { name: "Vegetable broth", quantity: "6", unit: "cups" },
          { name: "Mushrooms", quantity: "8", unit: "oz" },
          { name: "Onion", quantity: "1", unit: "" },
          { name: "Butter", quantity: "2", unit: "tbsp" },
          { name: "Parmesan", quantity: "1/2", unit: "cup" },
      ],

      steps: [
          "Warm broth in a pot and keep it hot.",
          "Brown mushrooms in a pan, then set aside.",
          "Cook onion in butter until soft.",
          "Add rice and toast for 1–2 minutes.",
          "Add broth one ladle at a time, stirring constantly until absorbed.",
          "Repeat until rice is creamy and tender.",
          "Stir in mushrooms and parmesan, then rest before serving.",
      ],
    },

    {
      title: "Baked Ziti with Ricotta",
      caption: "Cheesy baked pasta classic",
      description:
          "Baked pasta layered with ricotta, marinara, and mozzarella.",
      servings: 5,
      prep_time: "15 min",
      cook_time: "40 min",
      difficulty: "Medium",
      tags: ["Vegetarian", "Dinner", "Comfort Food"],

      ingredients: [
          { name: "Ziti pasta", quantity: "1", unit: "lb" },
          { name: "Ricotta", quantity: "1", unit: "cup" },
          { name: "Mozzarella", quantity: "2", unit: "cups" },
          { name: "Marinara sauce", quantity: "3", unit: "cups" },
          { name: "Parmesan", quantity: "1/2", unit: "cup" },
      ],

      steps: [
          "Cook pasta slightly under al dente and drain.",
          "Mix pasta with marinara sauce.",
          "Layer pasta, ricotta, and mozzarella in a baking dish.",
          "Repeat layers and top with parmesan.",
          "Bake covered at 375°F for 25 minutes.",
          "Uncover and bake 10–15 minutes until bubbly.",
          "Rest before serving.",
      ],
    },

    {
      title: "Spinach & Ricotta Stuffed Shells",
      caption: "Elegant, cheesy, and satisfying",
      description:
          "Jumbo pasta shells filled with ricotta and spinach, baked in marinara.",
      servings: 4,
      prep_time: "20 min",
      cook_time: "35 min",
      difficulty: "Medium",
      tags: ["Vegetarian", "Dinner", "Comfort Food"],

      ingredients: [
          { name: "Jumbo pasta shells", quantity: "20", unit: "" },
          { name: "Ricotta", quantity: "2", unit: "cups" },
          { name: "Spinach", quantity: "2", unit: "cups" },
          { name: "Marinara sauce", quantity: "2", unit: "cups" },
          { name: "Mozzarella", quantity: "1.5", unit: "cups" },
          { name: "Salt", quantity: " ", unit: "" },
          { name: "Pepper", quantity: "", unit: "" },
      ],

      steps: [
          "Cook shells until just tender, then drain and cool.",
          "Wilt spinach and squeeze out excess water.",
          "Mix ricotta, spinach, salt, and pepper.",
          "Fill shells carefully without tearing.",
          "Spread marinara in baking dish and arrange shells.",
          "Top with sauce and mozzarella.",
          "Bake covered at 375°F for 25 minutes, uncover and bake 10 more.",
          "Let rest before serving.",
      ],
    },
    
    {
      title: "Garlic Butter White Bean Skillet",
      caption: "Savory, cozy, one-pan comfort",
      description:
        "Creamy white beans simmered with garlic and herbs in a buttery skillet sauce using simple pantry staples.",
      servings: 2,
      prep_time: "10 min",
      cook_time: "15 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Dinner", "Quick", "Comfort Food"],

      ingredients: [
        { name: "Canned white beans", quantity: "1", unit: "can" },
        { name: "Butter", quantity: "2", unit: "tbsp" },
        { name: "Garlic", quantity: "3", unit: "cloves" },
        { name: "Vegetable broth", quantity: "1/2", unit: "cup" },
        { name: "Italian seasoning", quantity: "1", unit: "tsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
        { name: "Black pepper", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Open the can of beans and pour them into a strainer. Rinse under cold water for about 10 seconds to remove excess sodium.",
        "Let the beans sit in the strainer for 1–2 minutes so extra water drains off. This helps prevent a watery sauce.",
        "Place a skillet on the stove over medium heat. Add the butter and let it melt completely.",
        "Once melted, add minced garlic. Stir constantly for 30–45 seconds until fragrant but not browned.",
        "Add the drained beans and gently stir so they are coated in the garlic butter without breaking apart.",
        "Pour in the vegetable broth and sprinkle Italian seasoning evenly across the pan.",
        "Let everything simmer gently for 6–8 minutes, stirring occasionally, until the liquid slightly thickens.",
        "Taste and season with salt and black pepper as needed. Serve warm with bread or rice.",
      ],
    },

    {
      title: "Creamy Tomato Spinach Pasta",
      caption: "Weeknight pasta perfection",
      description:
        "Creamy tomato-based pasta with tender spinach that comes together quickly with pantry ingredients.",
      servings: 3,
      prep_time: "10 min",
      cook_time: "20 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Dinner", "Comfort Food"],

      ingredients: [
        { name: "Pasta", quantity: "10", unit: "oz" },
        { name: "Olive oil", quantity: "1", unit: "tbsp" },
        { name: "Garlic", quantity: "3", unit: "cloves" },
        { name: "Crushed tomatoes", quantity: "1", unit: "can" },
        { name: "Heavy cream", quantity: "1/2", unit: "cup" },
        { name: "Spinach", quantity: "3", unit: "cups" },
        { name: "Salt", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Bring a large pot of water to a boil. Add a generous pinch of salt so the water tastes slightly salty.",
        "Add pasta and cook until al dente according to package directions. Reserve ½ cup pasta water before draining.",
        "Heat olive oil in a large pan over medium heat. Add garlic and stir for 30 seconds until fragrant.",
        "Pour in crushed tomatoes and stir well. Let simmer for 8–10 minutes to reduce acidity.",
        "Lower heat and slowly stir in cream until the sauce becomes smooth and slightly pink.",
        "Add spinach in handfuls, stirring until fully wilted.",
        "Add cooked pasta and toss to coat. Use pasta water to loosen sauce if needed.",
        "Season with salt and serve immediately.",
      ],
    },

    {
      title: "Crispy Oven-Roasted Chickpeas",
      caption: "Crunchy, salty, addictive",
      description:
        "Perfectly crispy chickpeas roasted in the oven for snacking or topping salads.",
      servings: 2,
      prep_time: "10 min",
      cook_time: "30 min",
      difficulty: "Easy",
      tags: ["Vegan", "Snack", "Healthy"],

      ingredients: [
        { name: "Canned chickpeas", quantity: "1", unit: "can" },
        { name: "Olive oil", quantity: "1", unit: "tbsp" },
        { name: "Paprika", quantity: "1", unit: "tsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Preheat oven to 425°F / 220°C so chickpeas crisp instead of steaming.",
        "Drain and rinse chickpeas thoroughly, then pat completely dry using a towel.",
        "Spread chickpeas on a baking sheet and toss with olive oil, paprika, and salt.",
        "Arrange in a single layer so air can circulate around them.",
        "Roast for 25–30 minutes, shaking the pan halfway through.",
        "Remove when golden and crispy. Let cool for 5 minutes to fully crisp.",
      ],
    },

    {
      title: "Vegetable Fried Rice",
      caption: "Better than takeout",
      description:
        "Classic fried rice made with leftover rice and simple vegetables.",
      servings: 3,
      prep_time: "10 min",
      cook_time: "15 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Dinner", "Quick"],

      ingredients: [
        { name: "Cooked rice", quantity: "3", unit: "cups" },
        { name: "Oil", quantity: "2", unit: "tbsp" },
        { name: "Frozen mixed vegetables", quantity: "1", unit: "cup" },
        { name: "Soy sauce", quantity: "2", unit: "tbsp" },
      ],

      steps: [
        "Heat oil in a large pan or wok over medium-high heat.",
        "Add frozen vegetables and cook until heated through and slightly browned.",
        "Add rice and break up clumps using a spatula.",
        "Drizzle soy sauce evenly over rice and stir-fry for 3–5 minutes.",
        "Taste and adjust seasoning. Serve hot.",
      ],
    },

    {
      title: "One-Pot Creamy Mac & Cheese",
      caption: "Ultimate comfort food",
      description:
        "Creamy stovetop mac and cheese made entirely in one pot.",
      servings: 3,
      prep_time: "5 min",
      cook_time: "20 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Dinner", "Comfort Food"],

      ingredients: [
        { name: "Elbow pasta", quantity: "2", unit: "cups" },
        { name: "Milk", quantity: "2", unit: "cups" },
        { name: "Cheddar cheese", quantity: "1.5", unit: "cups" },
        { name: "Salt", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Add pasta and milk to a pot over medium heat.",
        "Stir frequently to prevent milk from scorching.",
        "Cook until pasta is tender and milk thickens into a sauce.",
        "Lower heat and gradually stir in cheese until melted and smooth.",
        "Season with salt and serve immediately.",
      ],
    },

    {
      title: "Simple Lentil Taco Filling",
      caption: "Protein-packed taco night",
      description:
        "Seasoned lentils cooked until tender and used as a flavorful taco filling.",
      servings: 3,
      prep_time: "10 min",
      cook_time: "25 min",
      difficulty: "Easy",
      tags: ["Vegan", "Dinner"],

      ingredients: [
        { name: "Dry lentils", quantity: "1", unit: "cup" },
        { name: "Water", quantity: "2.5", unit: "cups" },
        { name: "Taco seasoning", quantity: "2", unit: "tsp" },
      ],

      steps: [
        "Rinse lentils under cold water until water runs mostly clear.",
        "Add lentils and water to a pot and bring to a boil.",
        "Reduce heat and simmer uncovered for 20–25 minutes until tender.",
        "Drain any excess liquid.",
        "Stir in taco seasoning and cook 2 minutes more.",
      ],
    },

    {
      title: "Roasted Vegetable Sheet Pan Dinner",
      caption: "Minimal prep, big flavor",
      description:
        "Oven-roasted vegetables caramelized to perfection on one pan.",
      servings: 3,
      prep_time: "15 min",
      cook_time: "35 min",
      difficulty: "Easy",
      tags: ["Vegan", "Dinner", "Healthy"],

      ingredients: [
        { name: "Potatoes", quantity: "2", unit: "" },
        { name: "Carrots", quantity: "3", unit: "" },
        { name: "Broccoli", quantity: "2", unit: "cups" },
        { name: "Olive oil", quantity: "2", unit: "tbsp" },
        { name: "Salt", quantity: "to taste", unit: "" },
      ],

      steps: [
        "Preheat oven to 425°F / 220°C.",
        "Chop vegetables into evenly sized pieces for even cooking.",
        "Toss vegetables with olive oil and salt directly on the pan.",
        "Spread into a single layer with space between pieces.",
        "Roast for 35 minutes, flipping halfway through.",
        "Serve hot with crispy edges.",
      ],
    },

    {
      title: "Simple Garlic Rice",
      caption: "Fragrant, buttery staple",
      description:
        "Aromatic garlic rice that pairs with almost any dish.",
      servings: 3,
      prep_time: "5 min",
      cook_time: "20 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Side Dish"],

      ingredients: [
        { name: "Rice", quantity: "1", unit: "cup" },
        { name: "Garlic", quantity: "3", unit: "cloves" },
        { name: "Butter", quantity: "1", unit: "tbsp" },
        { name: "Water", quantity: "2", unit: "cups" },
      ],

      steps: [
        "Melt butter in a pot over medium heat.",
        "Add garlic and cook until fragrant but not browned.",
        "Add rice and stir to coat grains.",
        "Add water and bring to a boil.",
        "Cover, reduce heat, and simmer 18 minutes.",
        "Fluff with fork before serving.",
      ],
    },

    {
      title: "No-Bake Chocolate Peanut Butter Bars",
      caption: "Rich, sweet, no oven needed",
      description:
        "A simple dessert made with pantry staples and no baking required.",
      servings: 9,
      prep_time: "10 min",
      cook_time: "0 min",
      difficulty: "Easy",
      tags: ["Vegetarian", "Dessert", "No-Bake"],

      ingredients: [
        { name: "Peanut butter", quantity: "1/2", unit: "cup" },
        { name: "Butter", quantity: "1/4", unit: "cup" },
        { name: "Powdered sugar", quantity: "1", unit: "cup" },
        { name: "Chocolate chips", quantity: "1", unit: "cup" },
      ],

      steps: [
        "Line a small dish with parchment paper.",
        "Melt peanut butter and butter together until smooth.",
        "Stir in powdered sugar until thick and uniform.",
        "Press mixture firmly into dish.",
        "Melt chocolate chips and spread on top.",
        "Chill for 1 hour before slicing.",
      ],
    },

    {
      title: "Baked Cinnamon Apples",
      caption: "Warm, cozy dessert",
      description:
        "Tender baked apples with cinnamon and natural sweetness.",
      servings: 2,
      prep_time: "10 min",
      cook_time: "25 min",
      difficulty: "Easy",
      tags: ["Vegan", "Dessert", "Comfort Food"],

      ingredients: [
        { name: "Apples", quantity: "2", unit: "" },
        { name: "Cinnamon", quantity: "1", unit: "tsp" },
        { name: "Maple syrup", quantity: "2", unit: "tbsp" },
      ],

      steps: [
        "Preheat oven to 375°F / 190°C.",
        "Core apples and slice into wedges.",
        "Place apples in a baking dish.",
        "Sprinkle cinnamon and drizzle maple syrup evenly.",
        "Bake uncovered for 25 minutes until tender.",
        "Serve warm.",
      ],
    },


  ];
  