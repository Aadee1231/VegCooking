# Auto-Magic Planner Feature

## Overview
The Auto-Magic Planner is an intelligent meal planning system that creates optimal weekly meal plans based on user preferences, recipe history, and ingredient efficiency.

## Features
- **AI-Powered Planning**: Uses OpenAI GPT-4o-mini to generate intelligent meal suggestions
- **Personalization**: Considers user's past recipe interactions and preferences
- **Ingredient Efficiency**: Maximizes ingredient overlap to reduce food waste
- **Meal Differentiation**: Suggests appropriate recipes for breakfast, lunch, and dinner
- **Smart Scheduling**: Avoids recipe repetition and balances difficulty levels

## How It Works

### Frontend (React Native)
- **Button**: "Plan My Week" button in the MealPlan page next to Grocery List
- **Loading State**: Shows "Planning Your Week..." during processing
- **Auto-Application**: Automatically applies suggested meals to the weekly plan
- **User Feedback**: Displays success message with number of meals planned

### Backend (FastAPI + OpenAI)
1. **User Analysis**: Fetches user's recipe history and preferences
2. **Recipe Database**: Gets available recipes with ingredient data
3. **AI Planning**: Uses GPT-4o-mini to generate optimal meal plan
4. **Efficiency Scoring**: Calculates ingredient overlap and waste reduction
5. **Fallback System**: Provides simple random planning if AI fails

## API Endpoint

### POST `/smart-meal-plan`

**Request:**
```json
{
  "user_id": "user-uuid",
  "week_start": "2024-01-01",
  "existing_plans": [
    {
      "plan_date": "2024-01-01",
      "meal": "breakfast",
      "recipe_id": 123
    }
  ]
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "date": "2024-01-01",
      "meal": "lunch",
      "recipe_id": 456,
      "reason": "High protein lunch using similar ingredients to dinner"
    }
  ],
  "shared_ingredients": ["chicken", "rice", "onions"],
  "efficiency_score": 0.78
}
```

## Database Tables Used

### `meal_plans`
- Stores user's meal planning data
- Fields: `user_id`, `plan_date`, `meal`, `recipe_id`, `location`

### `recipes`
- Recipe metadata and user-created recipes
- Fields: `id`, `title`, `user_id`, `tags`, `created_at`

### `public_recipes_with_stats`
- View of all recipes with statistics
- Includes: `id`, `title`, `tags`, `difficulty`, `prep_time`, `cook_time`

### `recipe_ingredients`
- Recipe-ingredient relationships
- Fields: `recipe_id`, `ingredient_id`, `quantity`, `unit`

### `ingredients`
- Ingredient master data
- Fields: `id`, `name`, `norm_name`

## Configuration

### Environment Variables
```bash
# Backend
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE=your-service-role-key
OPENAI_API_KEY=your-openai-key

# Frontend
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

### Backend Test
```bash
python test_auto_planner.py
```

### Manual Testing
1. Open the MealPlan page in the app
2. Click "Plan My Week" button
3. Verify loading state appears
4. Confirm meals are added to the week
5. Check for success toast message

## AI Prompt Strategy

The system uses a structured prompt that includes:
- User's historical preferences and patterns
- Available recipe database with ingredients
- Efficiency requirements (ingredient overlap)
- Meal type appropriateness
- Variety and difficulty balancing
- Existing plan avoidance

## Error Handling

### Frontend
- Network timeout handling
- User authentication checks
- Graceful error messages with toast notifications
- Loading state management

### Backend
- Database connection errors
- OpenAI API failures with fallback
- Invalid recipe ID filtering
- Comprehensive error logging

## Future Enhancements

1. **Dietary Preferences**: Explicit dietary restrictions and goals
2. **Seasonal Ingredients**: Prioritize seasonal produce
3. **Calorie Targets**: Meet specific nutritional goals
4. **Budget Optimization**: Consider ingredient costs
5. **Cooking Time**: Balance quick vs. elaborate meals
6. **Learning Algorithm**: Improve suggestions based on user feedback

## Troubleshooting

### Common Issues
1. **Backend Not Running**: Ensure FastAPI server is running on port 8000
2. **Database Connection**: Check Supabase credentials and connectivity
3. **OpenAI API**: Verify API key is valid and has sufficient credits
4. **Missing Recipes**: Ensure recipe database has entries with ingredients

### Debug Mode
Set `DEBUG_IMPORT = True` in `backend/app/main.py` to see detailed logging of the planning process.
