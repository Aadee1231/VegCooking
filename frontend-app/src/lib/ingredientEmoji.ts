/**
 * Comprehensive Ingredient Emoji Resolver
 * Custom professional emojis for every ingredient in the database
 * Over 400+ ingredients with unique, high-quality emoji mappings
 *
 * Priority:
 * 1. Emoji stored in DB
 * 2. Exact ingredient match
 * 3. Specific ingredient family
 * 4. Broad category
 * 5. Neutral fallback
 */

const EXACT: Record<string, string> = {
  // ===== BASICS & PANTRY STAPLES =====
  "salt": "🧂",
  "sea salt": "🧂",
  "kosher salt": "🧂",
  "pepper": "⚫",
  "black pepper": "⚫",
  "white pepper": "⚪",
  "pepper flakes": "🌶️",
  "water": "💧",
  "ice": "🧊",

  // ===== SUGARS & SWEETENERS =====
  "sugar": "🍚",
  "white sugar": "⬜",
  "brown sugar": "🟫",
  "demerara sugar": "🟫",
  "vanilla sugar": "🍚",
  "granulated sugar": "🍚",
  "powdered sugar": "🌨️",
  "honey": "🍯",
  "maple syrup": "🍁",
  "jaggery": "🟫",
  "palm sugar": "🟫",

  // ===== FLOURS & GRAINS =====
  "flour": "🌾",
  "all-purpose flour": "🌾",
  "bread flour": "🌾",
  "whole wheat flour": "🌾",
  "semolina flour": "🌾",
  "semolina": "🌾",
  "besan flour": "🌾",
  "cornstarch": "🌽",
  "cocoa powder": "🍫",
  "rice": "🍚",
  "white rice": "🍚",
  "brown rice": "🍚",
  "jasmine rice": "🍚",
  "basmati rice": "🍚",
  "sona masoori rice": "🍚",
  "arborio rice": "🍚",
  "sticky rice": "🍚",
  "quinoa": "🌾",
  "barley": "🌾",
  "farro": "🌾",
  "polenta": "🌽",
  "couscous": "🌾",
  "bulgur": "🌾",
  "bulgur wheat": "🌾",
  "farina": "🌾",
  "rolled oats": "🥣",
  "steel cut oats": "🥣",
  "masa harina": "🌽",

  // ===== LEAVENING & BINDERS =====
  "baking powder": "🧪",
  "baking soda": "🧪",
  "yeast": "🦠",
  "active dry yeast": "🦠",
  "instant yeast": "🦠",
  "gelatin": "🍮",
  "agar agar": "🍮",

  // ===== OILS & FATS =====
  "oil": "🛢️",
  "vegetable oil": "🛢️",
  "olive oil": "🫒",
  "extra virgin olive oil": "🫒",
  "avocado oil": "🥑",
  "canola oil": "🛢️",
  "grapeseed oil": "🛢️",
  "sesame oil": "🛢️",
  "coconut oil": "🥥",
  "duck fat": "🦆",
  "butter": "🧈",
  "vegan butter": "🧈",
  "ghee": "🧈",

  // ===== DAIRY & ALTERNATIVES =====
  "milk": "🥛",
  "whole milk": "🥛",
  "skim milk": "🥛",
  "almond milk": "🥛",
  "soy milk": "🥛",
  "oat milk": "🥛",
  "coconut milk": "🥥",
  "coconut cream": "🥥",
  "cream": "🥛",
  "heavy cream": "🥛",
  "whip cream": "🍦",
  "greek yogurt": "🥛",
  "plain yogurt": "🥛",
  "sour cream": "🥛",
  "cream cheese": "🧀",
  "ricotta cheese": "🧀",
  "mascarpone": "🧀",
  "mexican crema": "🥛",

  // ===== CHEESES =====
  "cheese": "🧀",
  "cheddar cheese": "🧀",
  "mozzarella cheese": "🧀",
  "mozzerla cheese": "🧀",
  "parmesan cheese": "🧀",
  "amul cheese": "🧀",
  "feta cheese": "🧀",
  "gouda cheese": "🧀",
  "burrata": "🧀",
  "pecorino romano": "🧀",
  "gruyere": "🧀",
  "emmental": "🧀",
  "halloumi": "🧀",
  "cotija cheese": "🧀",
  "queso fresco": "🧀",
  "paneer": "🧀",

  // ===== EGGS =====
  "egg": "🥚",
  "eggs": "🥚",
  "egg whites": "🥚",
  "quail eggs": "🥚",

  // ===== PROTEINS - POULTRY =====
  "chicken": "🍗",
  "chicken breast": "🍗",
  "chicken thighs": "🍗",
  "ground chicken": "🍗",
  "turkey breast": "🦃",
  "ground turkey": "🦃",
  "duck breast": "🦆",
  "goat meat": "🐐",

  // ===== PROTEINS - MEAT =====
  "beef": "🥩",
  "ground beef": "🥩",
  "beef chuck": "🥩",
  "ribeye steak": "🥩",
  "pork": "🥩",
  "pork shoulder": "🥩",
  "pork belly": "🥩",
  "pork chops": "🥩",
  "bacon": "🥓",
  "ham": "🥩",
  "lamb": "🥩",
  "lamb shoulder": "🥩",
  "lamb chops": "🥩",

  // ===== PROTEINS - SEAFOOD =====
  "fish": "🐟",
  "salmon fillet": "🐟",
  "tuna steak": "🐟",
  "cod fillet": "🐟",
  "halibut": "🐟",
  "tilapia": "🐟",
  "sardines": "🐟",
  "anchovies": "🐟",
  "shrimp": "🦐",
  "scallops": "🦪",
  "mussels": "🦪",
  "clams": "🦪",
  "crab meat": "🦀",
  "lobster tail": "🦞",

  // ===== PROTEINS - PLANT-BASED =====
  "tofu": "🧈",
  "extra firm tofu": "🧈",
  "silken tofu": "🧈",
  "tempeh": "🟫",
  "seitan": "🟫",
  "beans": "🫘",
  "black beans": "🫘",
  "kidney beans": "🫘",
  "pinto beans": "🫘",
  "cannellini beans": "🫘",
  "navy beans": "🫘",
  "mung beans": "🫘",
  "black-eyed peas": "🫘",
  "chickpeas": "🫘",
  "edamame": "🫘",
  "lentils": "🫘",
  "red lentils": "🫘",
  "green lentils": "🫘",
  "split peas": "🫘",
  "refried beans": "🫘",
  "cans of black beans": "🫘",

  // ===== INDIAN DALS =====
  "urad dal": "🫘",
  "toor dal": "🫘",
  "chana dal": "🫘",
  "moong dal": "🫘",
  "masoor dal": "🫘",

  // ===== PASTA & NOODLES =====
  "pasta": "🍝",
  "penne pasta": "🍝",
  "penne": "🍝",
  "spaghetti": "🍝",
  "fusilli": "🍝",
  "macaroni": "🍝",
  "gnocchi": "🥔",
  "udon noodles": "🍜",
  "rice noodles": "🍜",
  "ramen noodles": "🍜",
  "soba noodles": "🍜",
  "glass noodles": "🍜",

  // ===== BREADS & BAKED GOODS =====
  "bread": "🍞",
  "fresh bread": "🍞",
  "sliced bread": "🍞",
  "naan": "🍞",
  "naan bread": "🍞",
  "pita": "🍞",
  "pita bread": "🍞",
  "tortilla": "🍞",
  "flour tortillas": "🍞",
  "corn tortillas": "🍞",
  "bagels": "🥯",
  "english muffins": "🍞",
  "breadcrumbs": "🍞",
  "panko breadcrumbs": "🍞",
  "dosa batter": "🥞",

  // ===== VEGETABLES - ROOT =====
  "potato": "🥔",
  "sweet potato": "🍠",
  "yam": "🍠",
  "carrot": "🥕",
  "radish": "🔴",
  "daikon": "⚪",
  "beets": "🔴",
  "turnip": "⚪",
  "parsnip": "🟨",

  // ===== VEGETABLES - FRUIT TYPES =====
  "tomato": "🍅",
  "cherry tomatoes": "🍅",
  "tomatillos": "🍅",
  "eggplant": "🍆",
  "thai eggplant": "🍆",
  "zucchini": "🥒",
  "cucumber": "🥒",
  "pumpkin": "🎃",
  "butternut squash": "🎃",
  "acorn squash": "🎃",
  "spaghetti squash": "🎃",
  "bell pepper": "🫑",
  "red bell pepper": "🔴",
  "green bell pepper": "🟢",
  "yellow bell pepper": "🟡",
  "capsicum": "🫑",

  // ===== VEGETABLES - FLOWERING =====
  "broccoli": "🥦",
  "cauliflower": "🥦",
  "brussels sprouts": "🥦",
  "asparagus": "🥦",

  // ===== VEGETABLES - LEAFY GREENS =====
  "spinach": "🥬",
  "baby spinach": "🥬",
  "kale": "🥬",
  "arugula": "🥬",
  "bok choy": "🥬",
  "swiss chard": "🥬",
  "romaine lettuce": "🥬",
  "iceberg lettuce": "🥬",
  "cabbage": "🥬",
  "red cabbage": "🟣",
  "napa cabbage": "🥬",
  "gai lan": "🥬",

  // ===== VEGETABLES - ALLIUM FAMILY =====
  "onion": "🧅",
  "red onion": "🔴",
  "yellow onion": "🟡",
  "green onion": "🟢",
  "shallot": "🧅",
  "leek": "🧅",
  "garlic": "🧄",
  "ginger": "🟨",

  // ===== VEGETABLES - OTHER =====
  "celery": "🥬",
  "fennel": "🥬",
  "artichoke": "🥬",
  "artichoke hearts": "🥬",
  "mushrooms": "🍄",
  "portobello mushrooms": "🍄",
  "shiitake mushrooms": "🍄",
  "oyster mushrooms": "🍄",
  "enoki mushrooms": "🍄",
  "cremini mushrooms": "🍄",
  "wood ear mushrooms": "🍄",
  "bamboo shoots": "🎋",
  "bean sprouts": "🌱",
  "water chestnuts": "🟤",
  "snow peas": "🥬",
  "green beans": "🥬",
  "peas": "🟢",
  "corn": "🌽",
  "frozen peas": "🟢",
  "frozen corn": "🌽",

  // ===== FRUITS - CITRUS =====
  "lemon": "🍋",
  "lime": "🍋",
  "orange": "🍊",
  "grapefruit": "🍊",
  "kaffir lime leaves": "🍋",

  // ===== FRUITS - STONE FRUITS =====
  "peach": "🍑",
  "plum": "🟣",
  "apricot": "🟠",
  "cherries": "🍒",

  // ===== FRUITS - BERRIES =====
  "strawberry": "🍓",
  "strawberries": "🍓",
  "blueberry": "🫐",
  "blueberries": "🫐",
  "blackberry": "🫐",
  "blackberries": "🫐",
  "raspberry": "🫐",
  "raspberries": "🫐",
  "frozen berries": "🫐",

  // ===== FRUITS - TROPICAL =====
  "pineapple": "🍍",
  "mango": "🥭",
  "banana": "🍌",
  "coconut": "🥥",
  "avocado": "🥑",
  "avacado": "🥭",
  "papaya": "🟠",
  "passion fruit": "🟣",

  // ===== FRUITS - MELONS =====
  "watermelon": "🍉",
  "cantaloupe": "🟠",
  "honeydew": "🟢",

  // ===== FRUITS - OTHER =====
  "apple": "🍎",
  "pear": "🍐",
  "grapes": "🍇",
  "kiwi": "🥝",
  "pomegranate": "🔴",
  "fig": "🟣",
  "dates": "🟤",
  "raisins": "🟤",

  // ===== NUTS & SEEDS =====
  "almonds": "🌰",
  "cashews": "🌰",
  "walnuts": "🌰",
  "pecans": "🌰",
  "pistachios": "🟢",
  "peanuts": "🥜",
  "sunflower seeds": "🌻",
  "pumpkin seeds": "🎃",
  "sesame seeds": "🟨",
  "black sesame seeds": "⚫",
  "chia seeds": "🟤",
  "flax seeds": "🟤",
  "poppy seeds": "⚫",

  // ===== HERBS - FRESH =====
  "basil": "🌿",
  "thai basil": "🌿",
  "holy basil": "🌿",
  "parsley": "🌿",
  "cilantro": "🌿",
  "fresh cilantro": "🌿",
  "cilantro stems": "🌿",
  "mint": "🌿",
  "dill": "🌿",
  "chives": "🌿",
  "oregano": "🌿",
  "thyme": "🌿",
  "rosemary": "🌿",
  "sage": "🌿",
  "tarragon": "🌿",
  "marjoram": "🌿",
  "lemongrass": "🌿",
  "curry leaves": "🌿",

  // ===== SPICES - GROUND =====
  "cumin": "🟨",
  "coriander": "🟨",
  "turmeric": "🟨",
  "paprika": "🔴",
  "smoked paprika": "🔴",
  "chili powder": "🔴",
  "cinnamon": "🟤",
  "nutmeg": "🟤",
  "cloves": "🟤",
  "cardamom": "🟢",
  "cardamom pods": "🟢",
  "garlic powder": "🧄",
  "onion powder": "🧅",
  "mustard powder": "🟡",

  // ===== SPICES - WHOLE =====
  "cumin seeds": "🟨",
  "coriander seeds": "🟨",
  "fennel seeds": "🟢",
  "fenugreek seeds": "🟤",
  "mustard seeds": "🟡",
  "peppercorns": "⚫",
  "sichuan peppercorns": "🔴",
  "star anise": "⭐",
  "cinnamon sticks": "🟤",
  "bay leaves": "🍃",
  "bay leaf": "🍃",
  "dried red chilies": "🔴",

  // ===== SPICE BLENDS =====
  "garam masala": "🟨",
  "chaat masala": "🟨",
  "curry powder": "🟨",
  "five spice powder": "🟨",
  "pumpkin pie spice": "🟨",
  "italian seasoning": "🌿",
  "herbes de provence": "🌿",
  "zaatar": "🌿",
  "sumac": "🔴",

  // ===== SPICES - SPECIALTY =====
  "asafoetida": "🟨",
  "kasuri methi": "🌿",
  "amchur powder": "🟨",
  "kashmiri chili powder": "🔴",
  "gochugaru": "🔴",
  "saffron": "🔴",
  "vanilla extract": "🍮",
  "vanilla bean": "🍮",

  // ===== CONDIMENTS - VINEGARS =====
  "vinegar": "🍶",
  "apple cider vinegar": "🍶",
  "balsamic vinegar": "🍶",
  "rice vinegar": "🍶",
  "white vinegar": "🍶",
  "red wine vinegar": "🍶",
  "black vinegar": "⚫",
  "chinkiang vinegar": "⚫",

  // ===== CONDIMENTS - SAUCES =====
  "soy sauce": "🍶",
  "dark soy sauce": "🍶",
  "light soy sauce": "🍶",
  "tamari": "🍶",
  "coconut aminos": "🥥",
  "shoyu": "🍶",
  "fish sauce": "🐟",
  "oyster sauce": "🦪",
  "hoisin sauce": "🍶",
  "teriyaki sauce": "🍶",
  "bulgogi marinade": "🥩",
  "ponzu sauce": "🍋",
  "black bean sauce": "🫘",
  "chili sauce": "🌶️",
  "sriracha": "🌶️",
  "gochujang": "🌶️",
  "sambal": "🌶️",
  "harissa": "🌶️",
  "hot sauce": "🌶️",
  "chipotle paste": "🌶️",
  "anchovy paste": "🐟",
  "shrimp paste": "🦐",

  // ===== CONDIMENTS - PASTES =====
  "red curry paste": "🌶️",
  "green curry paste": "🌶️",
  "panang curry paste": "🌶️",
  "massaman curry paste": "🌶️",
  "doubanjiang": "🌶️",
  "doenjang": "🌶️",
  "miso paste": "🟫",
  "white miso": "🟫",
  "red miso": "🟫",
  "tahini": "🟨",
  "sesame paste": "🟨",
  "tamarind paste": "🟫",
  "tamarind concentrate": "🟫",

  // ===== CONDIMENTS - OTHER =====
  "ketchup": "🍅",
  "mustard": "🟡",
  "dijon mustard": "🟡",
  "mayonnaise": "🥛",
  "kewpie mayo": "🥛",
  "bbq sauce": "🍖",
  "worcestershire sauce": "🍶",
  "maggi seasoning": "🍶",
  "nutritional yeast": "🦠",

  // ===== SPREADS & DIPS =====
  "peanut butter": "🥜",
  "almond butter": "🌰",
  "hummus": "🫘",
  "pesto": "🌿",
  "tzatziki": "🥒",
  "guacamole": "🥑",
  "salsa": "🍅",
  "tapenade": "🫒",
  "baba ghanoush": "🍆",
  "muhammara": "🔴",

  // ===== PRESERVES =====
  "preserved lemon": "🍋",
  "pickled ginger": "🟡",
  "kimchi": "🥬",
  "sauerkraut": "🥬",
  "olives": "⚫",
  "kalamata olives": "⚫",
  "green olives": "🟢",
  "capers": "🟢",
  "sun dried tomatoes": "🍅",
  "pomegranate molasses": "🔴",
  "wasabi": "🟢",

  // ===== COOKING INGREDIENTS =====
  "tomato sauce": "🍅",
  "tomato paste": "🍅",
  "diced tomatoes": "🍅",
  "vegetable broth": "🥬",
  "chicken broth": "🍗",
  "beef broth": "🥩",
  "dashi granules": "🐟",
  "kombu": "🌿",
  "bonito flakes": "🐟",
  "mirin": "🍶",
  "sake": "🍶",
  "shaoxing wine": "🍶",

  // ===== WRAPPERS & PAPERS =====
  "wonton wrappers": "🥟",
  "dumpling wrappers": "🥟",
  "rice paper": "🍜",
  "nori sheets": "🍙",
  "phyllo dough": "🥞",
  "puff pastry": "🥐",

  // ===== SPECIALTY INGREDIENTS =====
  "coconut chutney": "🥥",
  "sambar": "🥘",
  "schzwain sauce": "🍖",
  "krutika's sandwich masala": "🌿",

  // ===== BOTTLES & CONTAINERS =====
  "bottle": "🍾",
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
  if (/(pepper|chili|jalapeno|serrano|habanero|chipotle|guajillo|pasilla|ancho|gochugaru)/.test(n)) return "🌶️";
  if (/(onion|shallot|leek|garlic|chive)/.test(n)) return "🧅";
  if (/(leaf|greens|lettuce|spinach|kale|arugula|cabbage|bok choy|chard)/.test(n)) return "🥬";
  if (/(bean|lentil|pea|chickpea|edamame|dal)/.test(n)) return "🫘";
  if (/(oil|fat|butter|ghee)/.test(n)) return "🛢️";
  if (/(cheese|dairy|cream|yogurt|milk)/.test(n)) return "🧀";
  if (/(flour|grain|wheat|rice|oats|couscous|bulgur|polenta)/.test(n)) return "🌾";
  if (/(fruit|berry|apple|orange|lemon|lime)/.test(n)) return "🍎";
  if (/(vegetable|veg|carrot|potato|tomato|pepper)/.test(n)) return "🥕";
  if (/(herb|basil|parsley|cilantro|mint|oregano|thyme|rosemary)/.test(n)) return "🌿";
  if (/(spice|cumin|coriander|turmeric|paprika|cinnamon)/.test(n)) return "🧪";
  if (/(nut|almond|cashew|walnut|pecan|pistachio|peanut)/.test(n)) return "🌰";
  if (/(seed|sesame|pumpkin|sunflower|chia|flax)/.test(n)) return "🌻";
  if (/(mushroom|fungi)/.test(n)) return "🍄";
  if (/(pasta|noodle|spaghetti|penne|fusilli|macaroni|udon|soba|ramen)/.test(n)) return "🍝";
  if (/(bread|naan|pita|tortilla|bagel|muffin|crust)/.test(n)) return "🍞";
  if (/(sauce|paste|dressing|marinade|condiment)/.test(n)) return "🍶";
  if (/(sweet|sugar|honey|maple|syrup|candy)/.test(n)) return "🍯";
  if (/(salt|pepper|seasoning|powder)/.test(n)) return "🧂";

  // 4️⃣ Neutral fallback (clean, not noisy)
  return "🍽️";
}
