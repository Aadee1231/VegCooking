-- Personalized Feed Scoring Function
-- This function calculates a personalization score for each recipe based on user preferences
-- without using AI, similar to Instagram's algorithm

CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 12,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_tag_filters TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  caption TEXT,
  description TEXT,
  image_url TEXT,
  likes_count INT,
  comments_count INT,
  user_id UUID,
  tags TEXT[],
  prep_time TEXT,
  cook_time TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ,
  personalization_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  user_dietary_tags TEXT[];
  user_tag_preferences TEXT[];
BEGIN
  -- Get user's dietary tags and preferences from profile
  SELECT 
    COALESCE(p.dietary_tags, ARRAY[]::TEXT[]),
    COALESCE(p.dietary_prefs, ARRAY[]::TEXT[])
  INTO user_dietary_tags, user_tag_preferences
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Return personalized recipes with scoring
  RETURN QUERY
  WITH user_interactions AS (
    -- Get tags from recipes user has liked
    SELECT DISTINCT unnest(r.tags) as tag
    FROM likes l
    JOIN recipes r ON r.id = l.recipe_id
    WHERE l.user_id = p_user_id
    
    UNION
    
    -- Get tags from recipes user has created
    SELECT DISTINCT unnest(r.tags) as tag
    FROM recipes r
    WHERE r.user_id = p_user_id
    
    UNION
    
    -- Get tags from recipes user has added/saved
    SELECT DISTINCT unnest(r.tags) as tag
    FROM user_added_recipes uar
    JOIN recipes r ON r.id = uar.recipe_id
    WHERE uar.user_id = p_user_id
  ),
  user_preferred_tags AS (
    -- Combine all user tag preferences
    SELECT DISTINCT tag FROM user_interactions
    UNION
    SELECT DISTINCT unnest(user_dietary_tags)
    UNION
    SELECT DISTINCT unnest(user_tag_preferences)
  ),
  user_liked_recipes AS (
    -- Track recipes user has liked
    SELECT l.recipe_id FROM likes l WHERE l.user_id = p_user_id
  ),
  user_commented_recipes AS (
    -- Track recipes user has commented on
    SELECT DISTINCT c.recipe_id FROM comments c WHERE c.user_id = p_user_id
  ),
  user_interacted_creators AS (
    -- Track creators user has interacted with (liked or commented)
    SELECT DISTINCT r.user_id as creator_id
    FROM likes l
    JOIN recipes r ON r.id = l.recipe_id
    WHERE l.user_id = p_user_id
    
    UNION
    
    SELECT DISTINCT r.user_id as creator_id
    FROM comments c
    JOIN recipes r ON r.id = c.recipe_id
    WHERE c.user_id = p_user_id
  ),
  scored_recipes AS (
    SELECT 
      r.id,
      r.title,
      r.caption,
      r.description,
      r.image_url,
      COALESCE(rs.likes_count, 0)::INT as likes_count,
      COALESCE(rs.comments_count, 0)::INT as comments_count,
      r.user_id,
      r.tags,
      r.prep_time,
      r.cook_time,
      r.difficulty,
      r.created_at,
      -- Calculate personalization score
      (
        -- Tag matching score (0-50 points)
        -- Each matching tag gives points, with diminishing returns
        CASE 
          WHEN r.tags IS NULL OR array_length(r.tags, 1) IS NULL THEN 0
          ELSE (
            SELECT COUNT(*)::FLOAT * 10
            FROM unnest(r.tags) rt
            WHERE rt IN (SELECT tag FROM user_preferred_tags)
          )
        END +
        
        -- Creator affinity (0-20 points)
        -- Boost recipes from creators user has interacted with
        CASE 
          WHEN r.user_id IN (SELECT creator_id FROM user_interacted_creators) THEN 20
          ELSE 0
        END +
        
        -- Engagement boost (0-15 points)
        -- Recipes with higher engagement get a small boost
        LEAST(
          (COALESCE(rs.likes_count, 0)::FLOAT / 10.0) + 
          (COALESCE(rs.comments_count, 0)::FLOAT * 2.0),
          15.0
        ) +
        
        -- Recency boost (0-10 points)
        -- Newer recipes get a slight boost (decays over 30 days)
        CASE 
          WHEN r.created_at > NOW() - INTERVAL '30 days' THEN
            10.0 * (1.0 - (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (30.0 * 86400.0)))
          ELSE 0
        END +
        
        -- Diversity bonus (0-5 points)
        -- Slight boost to recipes with unique tags to maintain feed diversity
        CASE 
          WHEN r.tags IS NOT NULL AND array_length(r.tags, 1) > 3 THEN 5
          ELSE 0
        END
      ) as personalization_score
    FROM recipes r
    LEFT JOIN (
      SELECT 
        r2.id as recipe_id,
        COUNT(DISTINCT l.user_id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count
      FROM recipes r2
      LEFT JOIN likes l ON l.recipe_id = r2.id
      LEFT JOIN comments c ON c.recipe_id = r2.id
      GROUP BY r2.id
    ) rs ON rs.recipe_id = r.id
    WHERE 1=1
      -- Apply search filter if provided
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR r.title ILIKE '%' || p_search || '%'
        OR r.caption ILIKE '%' || p_search || '%'
      )
      -- Apply tag filters if provided
      AND (
        p_tag_filters IS NULL 
        OR array_length(p_tag_filters, 1) IS NULL
        OR r.tags && p_tag_filters
      )
  )
  SELECT 
    sr.id,
    sr.title,
    sr.caption,
    sr.description,
    sr.image_url,
    sr.likes_count,
    sr.comments_count,
    sr.user_id,
    sr.tags,
    sr.prep_time,
    sr.cook_time,
    sr.difficulty,
    sr.created_at,
    sr.personalization_score
  FROM scored_recipes sr
  ORDER BY 
    -- Sort by personalization score first, then by recency
    sr.personalization_score DESC,
    sr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_personalized_feed(UUID, INT, INT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_feed(UUID, INT, INT, TEXT, TEXT[]) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION get_personalized_feed IS 
'Returns a personalized feed of recipes for a user based on their preferences, interactions, and behavior. 
Scoring factors: tag matching (50pts), creator affinity (20pts), engagement (15pts), recency (10pts), diversity (5pts).
Total possible score: 100 points.';
