# Personalized Feed Algorithm

## Overview

This document describes the Instagram-style recommendation algorithm implemented for the Flavur app. The algorithm personalizes the recipe feed based on user preferences, interactions, and behavior **without using AI**.

## When It Activates

The personalized algorithm **only activates** when:
1. ✅ User is logged in
2. ✅ Viewing the "All" tag (no specific tag filters selected)
3. ✅ No search query is active

When users filter by specific tags or search for recipes, the standard chronological feed is used instead.

## Scoring System

Each recipe receives a **personalization score** (0-100 points) based on five factors:

### 1. Tag Matching (0-50 points)
**Most Important Factor**

Recipes earn points when their tags match the user's preferences:
- User's `dietary_tags` from profile
- User's `dietary_prefs` from profile  
- Tags from recipes the user has **created**
- Tags from recipes the user has **liked**
- Tags from recipes the user has **saved/added**

**Scoring:** Each matching tag = 10 points (up to 50 max)

**Example:**
- User has dietary tags: `["Vegan", "Gluten-Free"]`
- User has liked recipes with tags: `["Quick", "Dessert"]`
- Recipe with tags `["Vegan", "Quick", "Dessert"]` = 30 points (3 matches × 10)

### 2. Creator Affinity (0-20 points)

Recipes from creators the user has interacted with get boosted.

**Interactions include:**
- Liked any recipe from this creator
- Commented on any recipe from this creator

**Scoring:** If user has interacted with creator = 20 points, otherwise 0

### 3. Engagement Boost (0-15 points)

Popular recipes get a small boost to ensure quality content surfaces.

**Formula:**
```
score = min((likes_count / 10) + (comments_count × 2), 15)
```

**Example:**
- Recipe with 50 likes, 3 comments = min((50/10) + (3×2), 15) = min(11, 15) = 11 points
- Recipe with 100 likes, 10 comments = min((100/10) + (10×2), 15) = 15 points (capped)

### 4. Recency Boost (0-10 points)

Newer recipes get a slight boost that decays over 30 days.

**Formula:**
```
If recipe is < 30 days old:
  score = 10 × (1 - (days_old / 30))
Else:
  score = 0
```

**Example:**
- Recipe posted today = 10 points
- Recipe posted 15 days ago = 5 points
- Recipe posted 30+ days ago = 0 points

### 5. Diversity Bonus (0-5 points)

Recipes with more tags (4+) get a small boost to maintain feed diversity.

**Scoring:** If recipe has 4+ tags = 5 points, otherwise 0

## Sorting Logic

Recipes are sorted by:
1. **Primary:** Personalization score (highest first)
2. **Secondary:** Creation date (newest first)

This ensures highly relevant content appears first while maintaining some recency bias.

## Database Implementation

### Supabase RPC Function

The algorithm is implemented as a PostgreSQL function: `get_personalized_feed()`

**Location:** `backend/supabase_migrations/personalized_feed_function.sql`

**Parameters:**
- `p_user_id` (UUID): The user requesting the feed
- `p_limit` (INT): Number of recipes to return (default: 12)
- `p_offset` (INT): Pagination offset (default: 0)
- `p_search` (TEXT): Optional search query (default: NULL)
- `p_tag_filters` (TEXT[]): Optional tag filters (default: NULL)

**Returns:** Recipe list with personalization scores

### Frontend Integration

**Location:** `frontend-app/app/tabs/feed.tsx`

The feed automatically switches between personalized and standard modes:

```typescript
const usePersonalizedFeed = userId && effectiveTags.length === 0 && !debouncedSearch.length;

if (usePersonalizedFeed) {
  // Call RPC function for personalized feed
  const result = await supabase.rpc('get_personalized_feed', {
    p_user_id: userId,
    p_limit: PAGE_SIZE,
    p_offset: offset
  });
} else {
  // Standard chronological feed with filters
  // ...
}
```

## Deployment Instructions

### Step 1: Deploy the SQL Function

Run the SQL migration in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/supabase_migrations/personalized_feed_function.sql`
3. Paste and run the SQL
4. Verify success: You should see "Success. No rows returned"

### Step 2: Verify Permissions

The function should be accessible to both authenticated and anonymous users:

```sql
-- Check permissions
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_personalized_feed';
```

### Step 3: Test the Function

Test the function directly in Supabase:

```sql
-- Replace with a real user UUID from your profiles table
SELECT * FROM get_personalized_feed(
  'YOUR-USER-UUID-HERE'::UUID,
  12,  -- limit
  0,   -- offset
  NULL, -- search
  NULL  -- tag_filters
);
```

You should see recipes with personalization scores.

### Step 4: Deploy Frontend Changes

The frontend changes in `feed.tsx` are already integrated. Just deploy your app normally:

```bash
# For mobile app
cd frontend-app
npm run build  # or your build command

# For web
cd frontend-web
npm run build
```

## Testing the Algorithm

### Test Scenario 1: New User (Cold Start)

**Setup:**
- New user with no interactions
- No dietary tags set

**Expected Result:**
- Feed shows popular recipes (high engagement scores)
- Recent recipes get slight boost
- Essentially a "trending" feed

### Test Scenario 2: User with Dietary Preferences

**Setup:**
- User has `dietary_tags: ["Vegan", "Gluten-Free"]`
- No other interactions yet

**Expected Result:**
- Vegan and Gluten-Free recipes appear first
- Each matching tag adds 10 points
- Recipes with both tags score 20+ points

### Test Scenario 3: Active User

**Setup:**
- User has liked 10 recipes with tags: `["Quick", "Dessert", "Vegan"]`
- User has created 3 recipes with tags: `["Breakfast", "Healthy"]`
- User has commented on recipes from 2 specific creators

**Expected Result:**
- Recipes with Quick/Dessert/Vegan/Breakfast/Healthy tags score high (tag matching)
- Recipes from the 2 creators get +20 points (creator affinity)
- Mix of familiar and new content

### Test Scenario 4: Tag Filter Active

**Setup:**
- User clicks "Dessert" tag filter
- User has personalization preferences

**Expected Result:**
- Personalized algorithm **DISABLED**
- Standard chronological feed of Dessert recipes
- No personalization scores applied

### Test Scenario 5: Search Active

**Setup:**
- User searches for "chocolate"
- User has personalization preferences

**Expected Result:**
- Personalized algorithm **DISABLED**
- Standard search results (title/caption matching)
- No personalization scores applied

## Monitoring & Analytics

### Key Metrics to Track

1. **Engagement Rate**
   - Compare likes/comments on personalized vs. standard feed
   - Track time spent on feed

2. **Diversity Score**
   - Ensure users see variety, not just same tags
   - Monitor tag distribution in personalized feeds

3. **Creator Discovery**
   - Track how many new creators users discover
   - Monitor creator affinity effectiveness

4. **User Satisfaction**
   - Survey users about feed relevance
   - Track recipe save rates from feed

### Debugging Queries

**Check user's tag preferences:**
```sql
SELECT 
  id,
  username,
  dietary_tags,
  dietary_prefs
FROM profiles
WHERE id = 'USER-UUID';
```

**Check user's interaction history:**
```sql
-- Liked recipes
SELECT r.id, r.title, r.tags
FROM likes l
JOIN recipes r ON r.id = l.recipe_id
WHERE l.user_id = 'USER-UUID'
ORDER BY l.created_at DESC
LIMIT 20;

-- Created recipes
SELECT id, title, tags
FROM recipes
WHERE user_id = 'USER-UUID'
ORDER BY created_at DESC;

-- Saved recipes
SELECT r.id, r.title, r.tags
FROM user_added_recipes uar
JOIN recipes r ON r.id = uar.recipe_id
WHERE uar.user_id = 'USER-UUID'
ORDER BY uar.created_at DESC;
```

**Test personalization score for specific recipe:**
```sql
SELECT 
  id,
  title,
  tags,
  personalization_score
FROM get_personalized_feed('USER-UUID'::UUID, 100, 0, NULL, NULL)
WHERE id = RECIPE_ID;
```

## Future Enhancements

### Potential Improvements

1. **Time-based Preferences**
   - Show breakfast recipes in morning
   - Show dinner recipes in evening

2. **Seasonal Boosting**
   - Boost seasonal recipes (summer salads, winter soups)
   - Holiday-specific content

3. **Collaborative Filtering**
   - "Users like you also liked..."
   - Find similar users based on taste profiles

4. **Negative Signals**
   - Track recipes user scrolled past quickly
   - Reduce score for ignored content

5. **Ingredient-based Matching**
   - Match recipes with ingredients user frequently uses
   - Avoid recipes with ingredients user dislikes

6. **Difficulty Matching**
   - Learn user's preferred difficulty level
   - Boost recipes matching their skill level

7. **Prep Time Preferences**
   - Learn if user prefers quick or elaborate recipes
   - Adjust scores based on time preferences

## Troubleshooting

### Issue: Personalized feed not activating

**Check:**
1. Is user logged in? (`userId` must be set)
2. Is "All" tag selected? (`activeTags.length === 0`)
3. Is search empty? (`debouncedSearch.length === 0`)

**Debug:**
```typescript
console.log('usePersonalizedFeed:', {
  userId,
  effectiveTags: effectiveTags.length,
  search: debouncedSearch.length
});
```

### Issue: All recipes have score 0

**Possible causes:**
1. User has no preferences set (new user)
2. No matching tags between user preferences and recipes
3. Function not deployed correctly

**Solution:**
- Encourage users to set dietary preferences
- Like/save recipes to build preference profile
- Verify SQL function is deployed

### Issue: Same recipes always appear first

**Possible causes:**
1. Limited recipe pool
2. User preferences too narrow
3. Need more diversity in scoring

**Solution:**
- Add more recipes to database
- Increase diversity bonus weight
- Add randomization factor for ties

## Performance Considerations

### Query Optimization

The RPC function uses several optimizations:

1. **CTEs (Common Table Expressions):** Break complex query into manageable parts
2. **Indexed Columns:** Ensure `user_id`, `recipe_id`, `created_at` are indexed
3. **Array Operations:** Use PostgreSQL's native array functions for tag matching
4. **Limit Early:** Apply LIMIT/OFFSET at the end to reduce data transfer

### Caching Strategy

Consider implementing:

1. **Client-side caching:** Cache personalized feed for 5-10 minutes
2. **Edge caching:** Use CDN for popular recipe data
3. **Materialized views:** Pre-compute engagement scores

### Scaling Considerations

For large user bases:

1. **Pagination:** Use offset-based pagination (already implemented)
2. **Background jobs:** Pre-compute scores for active users
3. **Read replicas:** Route feed queries to read replicas
4. **Denormalization:** Store computed scores in separate table

## Conclusion

This personalized feed algorithm provides an Instagram-like experience that:
- ✅ Prioritizes content matching user preferences
- ✅ Maintains feed diversity
- ✅ Surfaces quality content through engagement signals
- ✅ Respects user intent (filters, search)
- ✅ Requires no AI/ML infrastructure
- ✅ Performs efficiently at scale

The algorithm will improve over time as users interact more with the platform, creating a better experience for everyone.
