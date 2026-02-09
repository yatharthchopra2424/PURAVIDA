-- ====================================================================================
-- SUPABASE SEARCH OPTIMIZATION FOR PURAVIDA
-- Fix for: ERROR: 42704: operator class "gin_trgm_ops" does not exist
-- ====================================================================================

-- Step 1: Enable the pg_trgm extension (required for trigram indexes)
-- Run this first - if you get an error about extension already existing, that's OK
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create GIST indexes for trigram similarity search (faster than GIN for text)
-- These support the ILIKE operator (case-insensitive pattern matching)

-- Index on product name field
CREATE INDEX IF NOT EXISTS idx_products_name_search 
ON products USING GIST (name gist_trgm_ops);

-- Index on botanical name field  
CREATE INDEX IF NOT EXISTS idx_products_botanical_name_search
ON products USING GIST (botanical_name gist_trgm_ops);

-- Index on active ingredient field
CREATE INDEX IF NOT EXISTS idx_products_active_ingredient_search
ON products USING GIST (active_ingredient gist_trgm_ops);

-- Index on active compound field
CREATE INDEX IF NOT EXISTS idx_products_active_compound_search
ON products USING GIST (active_compound gist_trgm_ops);

-- Step 3: Create standard B-tree index for popularity sorting (essential for performance)
CREATE INDEX IF NOT EXISTS idx_products_popularity
ON products (popularity DESC);

-- Step 4: Create multi-column index for frequently searched combinations
CREATE INDEX IF NOT EXISTS idx_products_category_popularity
ON products (category_id, popularity DESC);

-- Step 5 (OPTIONAL): Create a computed search column for advanced searches
-- This combines multiple fields into one searchable column
-- Uncomment if you want ultra-fast searches on multiple fields at once

/*
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_text tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(botanical_name, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(active_ingredient, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_text
ON products USING GIN (search_text);
*/

-- Step 6: Verify indexes were created
-- Run this query to check:
-- SELECT schemaname, tablename, indexname FROM pg_indexes 
-- WHERE tablename = 'products' AND indexname LIKE 'idx_products%';

-- ====================================================================================
-- PERFORMANCE NOTES:
-- ====================================================================================
-- 
-- 1. GIST vs GIN for trigram search:
--    - GIST: Better for ILIKE (pattern matching), smaller indexes, faster updates
--    - GIN: Better for full text search, can be larger but very fast for searches
--    
-- 2. Alternative if GIST trigram doesn't work:
--    - Remove the GIST trigram indexes above
--    - Use simple B-tree indexes (automatically created on varchar columns)
--    - App will use ILIKE which is slower but works without extensions
--
-- 3. For production:
--    - Monitor query performance with EXPLAIN ANALYZE
--    - Consider using Supabase's full-text search if trigram indexes aren't available
--    - Add ANALYZE statistics: ANALYZE products;
--
-- ====================================================================================
