/**
 * Ingredient Emoji Resolver
 * Designed for professional recipe apps (ReciMe / Yoomla quality)
 *
 * Priority:
 * 1. Emoji stored in DB
 * 2. Exact ingredient match
 * 3. Specific ingredient family
 * 4. Broad category
 * 5. Neutral fallback
 */

const EXACT: Record<string, string> = {
  // ===== SALTS =====
  "salt": "🧂",
  "sea salt": "🧂",
  "kosher salt": "🧂",

  // ===== PEPPERS (NOT SALT) =====
  "black pepper": "⚫",
  "white pepper": "⚪",
  "pepper": "⚫",
  "peppercorn": "⚫",

  // ===== SUGARS & SWEETENERS =====
  "sugar": "⬜",
  "white sugar": "⬜",
  "brown sugar": "🟫",
  "demerara sugar": "🟫",
  "cane sugar": "⬜",
  "vanilla sugar": "⬜",
  "honey": "🍯",
  "maple syrup": "🍁",

  // ===== FLOURS & STARCHES =====
  "flour": "🌾",
  "all-purpose flour": "🌾",
  "bread flour": "🌾",
  "whole wheat flour": "🌾",
  "cornstarch": "🌽",

  // ===== LEAVENING =====
  "baking powder": "🧪",
  "baking soda": "🧪",
  "yeast": "🦠",

  // ===== OILS & FATS =====
  "vegetable oil": "🛢️",
  "canola oil": "🛢️",
  "grapeseed oil": "🛢️",
  "olive oil": "🫒",
  "avocado oil": "🥑",
  "sesame oil": "🛢️",
  "coconut oil": "🥥",

  // ===== DAIRY =====
  "milk": "🥛",
  "almond milk": "🥛",
  "soy milk": "🥛",
  "oat milk": "🥛",
  "cream": "🥛",
  "whip cream": "🥛",

  "butter": "🧈",
  "vegan butter": "🧈",
  "ghee": "🧈",

  "cheese": "🧀",
  "cheddar cheese": "🧀",
  "parmesan cheese": "🧀",
  "mozzarella cheese": "🧀",
  "paneer": "🧀",

  // ===== EGGS & PROTEIN =====
  "egg": "🥚",
  "eggs": "🥚",

  "chicken": "🍗",
  "chicken breast": "🍗",
  "beef": "🥩",
  "pork": "🥩",
  "lamb": "🥩",

  "fish": "🐟",
  "salmon": "🐟",
  "tuna": "🐟",
  "shrimp": "🦐",

  // ===== GRAINS =====
  "rice": "🍚",
  "barley": "🌾",
  "farro": "🌾",
  "quinoa": "🌾",

  "pasta": "🍝",
  "penne pasta": "🍝",

  // ===== BREADS =====
  "bread": "🍞",
  "sliced bread": "🍞",
  "naan": "🍞",
  "pita": "🍞",
  "tortilla": "🍞",

  // ===== LEGUMES =====
  "beans": "🫘",
  "black-eyed peas": "🫘",
  "pinto beans": "🫘",
  "cannellini beans": "🫘",
  "navy beans": "🫘",
  "mung beans": "🫘",
  "lentils": "🫘",
  "red lentils": "🫘",
  "green lentils": "🫘",
  "split peas": "🫘",

  // ===== NUTS =====
  "walnuts": "🌰",
  "almonds": "🌰",
  "cashews": "🌰",
  "pistachios": "🌰",

  // ===== FRUITS =====
  "apple": "🍎",
  "pineapple": "🍍",
  "lemon": "🍋",
  "lime": "🍋",
  "strawberry": "🍓",
  "blueberry": "🫐",
  "blackberry": "🫐",
  "avocado": "🥑",

  // ===== VEGETABLES =====
  "potato": "🥔",
  "sweet potato": "🍠",
  "carrot": "🥕",
  "eggplant": "🍆",
  "zucchini": "🥒",
  "capsicum": "🫑",

  "spinach": "🥬",
  "kale": "🥬",
  "arugula": "🥬",
  "bok choy": "🥬",
  "swiss chard": "🥬",

  "mushrooms": "🍄",
  "shiitake mushrooms": "🍄",
  "oyster mushrooms": "🍄",
  "enoki mushrooms": "🍄",
  "cremini mushrooms": "🍄",

  // ===== HERBS =====
  "basil": "🌿",
  "parsley": "🌿",
  "cilantro": "🌿",
  "mint": "🌿",
  "oregano": "🌿",
  "thyme": "🌿",
  "rosemary": "🌿",

  // ===== CONDIMENTS =====
  "vinegar": "🍶",
  "apple cider vinegar": "🍶",
  "soy sauce": "🍶",
  "tamari": "🍶",
  "hot sauce": "🌶️",
  "mustard": "🟡",

  // ===== WATER =====
  "water": "💧",
};

export function resolveIngredientEmoji(
  nameRaw: string,
  emojiFromDB?: string | null
) {
  // 1️⃣ DB emoji always wins
  if (emojiFromDB && emojiFromDB.trim()) return emojiFromDB;

  const n = nameRaw.toLowerCase().trim();

  // 2️⃣ Exact match (preferred)
  if (EXACT[n]) return EXACT[n];

  // 3️⃣ Fallback families
  if (/(pepper|chili|jalapeno|serrano|habanero)/.test(n)) return "🌶️";
  if (/(onion|shallot|leek|garlic)/.test(n)) return "🧅";
  if (/(leaf|greens|lettuce)/.test(n)) return "🥬";
  if (/(bean|lentil|pea)/.test(n)) return "🫘";
  if (/(oil|fat)/.test(n)) return "🛢️";
  if (/(cheese|dairy)/.test(n)) return "🧀";
  if (/(flour|grain|wheat)/.test(n)) return "🌾";
  if (/(fruit)/.test(n)) return "🍎";
  if (/(vegetable)/.test(n)) return "🥕";

  // 4️⃣ Neutral fallback (clean, not noisy)
  return "🍽️";
}
