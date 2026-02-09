-- ====================================================================================
-- DEBUG SEARCH QUERIES - Test if data exists and search works
-- ====================================================================================

-- Step 1: Check if products table has data
SELECT COUNT(*) as total_products FROM products;

-- Step 2: Check if "Piperine" products exist
SELECT id, name, active_ingredient, active_compound FROM products 
WHERE name ILIKE '%piperine%' 
   OR active_ingredient ILIKE '%piperine%'
   OR active_compound ILIKE '%piperine%';

-- Step 3: Check all products with active_ingredient like '%Piperine%'
SELECT id, name, slug, category_id, active_ingredient, popularity 
FROM products 
WHERE active_ingredient IS NOT NULL
ORDER BY popularity DESC 
LIMIT 10;

-- Step 4: Test case-insensitive search
SELECT id, name, active_ingredient FROM products 
WHERE LOWER(name) LIKE '%curcumin%'
   OR LOWER(botanical_name) LIKE '%curcumin%'
   OR LOWER(active_ingredient) LIKE '%curcumin%'
LIMIT 5;

-- Step 5: Verify all search fields are populated
SELECT 
  COUNT(*) as total,
  COUNT(name) as name_count,
  COUNT(botanical_name) as botanical_name_count,
  COUNT(active_ingredient) as active_ingredient_count,
  COUNT(active_compound) as active_compound_count
FROM products;

-- Step 6: Check for any NULL values that might break search
SELECT id, name, 
  CASE WHEN name IS NULL THEN 'NAME NULL' ELSE 'OK' END,
  CASE WHEN botanical_name IS NULL THEN 'BOT NULL' ELSE 'OK' END,
  CASE WHEN active_ingredient IS NULL THEN 'INGREDIENT NULL' ELSE 'OK' END
FROM products 
WHERE name IS NULL 
   OR botanical_name IS NULL 
   OR active_ingredient IS NULL
LIMIT 5;

-- Step 7: Run the exact search that the app uses (testing ILIKE with OR)
SELECT id, name, slug, category_id, active_ingredient, popularity 
FROM products 
WHERE name ILIKE '%piperine%'
   OR botanical_name ILIKE '%piperine%'
   OR active_ingredient ILIKE '%piperine%'
   OR active_compound ILIKE '%piperine%'
ORDER BY popularity DESC
LIMIT 24;

-- ====================================================================================
