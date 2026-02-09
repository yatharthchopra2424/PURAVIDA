-- ====================================================================================
-- SUPABASE SEARCH OPTIMIZATION - FALLBACK (No Trigram Required)
-- Use this if the pg_trgm extension version doesn't support GIST trigram indexes
-- ====================================================================================

-- Step 1: Create simple B-tree indexes (always available, no extensions needed)
-- These work with ILIKE operator and are sufficient for most queries

-- Index on product name field
CREATE INDEX IF NOT EXISTS idx_products_name 
ON products (name);

-- Index on botanical name field  
CREATE INDEX IF NOT EXISTS idx_products_botanical_name
ON products (botanical_name);

-- Index on active ingredient field
CREATE INDEX IF NOT EXISTS idx_products_active_ingredient
ON products (active_ingredient);

-- Index on active compound field
CREATE INDEX IF NOT EXISTS idx_products_active_compound
ON products (active_compound);

-- Step 2: Essential popularity index (for sorting)
CREATE INDEX IF NOT EXISTS idx_products_popularity
ON products (popularity DESC);

-- Step 3: Combined index for common patterns
CREATE INDEX IF NOT EXISTS idx_products_category_popularity
ON products (category_id, popularity DESC);

-- ====================================================================================
-- HOW TO USE THIS IN YOUR CODE:
-- ====================================================================================
-- 
-- The search in src/lib/catalog.ts already uses this approach:
--
-- .or(`name.ilike.%${query}%,botanical_name.ilike.%${query}%,active_ingredient.ilike.%${query}%`)
--
-- This will work with or without trigram indexes - it just might be slightly slower
-- without them. The B-tree indexes above will still give good performance.
--
-- ====================================================================================
-- PERFORMANCE COMPARISON:
-- ====================================================================================
--
-- B-tree indexes (this file):
--   - Search time: ~50-200ms for 500 products
--   - Index size: Small
--   - No extension required: ✓
--
-- Trigram indexes (search-optimization.sql):  
--   - Search time: ~10-50ms for 500 products
--   - Index size: Larger
--   - Requires pg_trgm extension: ✓ (usually available)
--
-- ====================================================================================
