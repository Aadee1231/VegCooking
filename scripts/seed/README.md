# Recipe Seeding System

## File Structure
```
scripts/seed/
├── .env.seed              # Environment variables (Supabase credentials + user ID)
├── seed.js                # Main seeding script (dynamically loads recipes)
├── clear.js               # Clears all data for current user
├── manage.js              # Recipe management commands
├── seedRecipes_admin.js    # Admin account recipes (20 original recipes)
└── seedRecipes_user.js     # User account recipes (your custom recipes)
```

## How It Works

The system automatically loads the correct recipe file based on the `SEED_USER_ID` in `.env.seed`:

- **Admin ID** (`6e1cbfe7-fc5b-47f5-9374-26e69eacc538`) → Loads `seedRecipes_admin.js`
- **Any other ID** → Loads `seedRecipes_user.js`

## Commands

### Seed/Update Recipes
```bash
node scripts/seed/seed.js
```
- Creates new recipes or updates existing ones
- Automatically handles ingredients and steps
- Safe to run multiple times

### Management Commands
```bash
# List recipes currently in database for this user
node scripts/seed/manage.js list

# Show recipes available in current user's file
node scripts/seed/manage.js show-available

# Delete specific recipe (get ID from list command)
node scripts/seed/manage.js delete 123
```

### Clear All Data
```bash
node scripts/seed/clear.js
```
- Removes all recipes, ingredients, and steps for current user
- Use when starting fresh

## Adding New Users

1. Create new recipe file: `seedRecipes_newuser.js`
2. Update `seed.js` and `manage.js` to handle new user ID
3. Change `SEED_USER_ID` in `.env.seed`

## Recipe Format

Each recipe follows this structure:
```javascript
{
  title: "Recipe Title",
  caption: "Short description",
  description: "Full description",
  servings: 4,
  prep_time: "15 min",
  cook_time: "30 min", 
  difficulty: "Easy|Medium|Hard",
  tags: ["Tag1", "Tag2"],
  ingredients: [
    { name: "Ingredient", quantity: "1", unit: "cup" }
  ],
  steps: [
    "Step 1 instruction",
    "Step 2 instruction"
  ]
}
```

## Important Notes

- **No duplicates**: System checks by title + user_id
- **Safe updates**: Edit recipes and re-run to update
- **Separate accounts**: Each user gets only their intended recipes
- **Preserves data**: Original recipes stay in admin account
