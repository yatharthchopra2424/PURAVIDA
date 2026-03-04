-- ====================================================================================
-- OVERWRITE: CATEGORY CONSOLIDATION + CLEANUP
--
-- Requested changes:
-- 1) Merge "phytochemicals" products into "herbal-extracts" and remove category.
-- 2) Merge "amino-acids" products into "nutraceuticals" and remove category.
-- 3) Remove "fruit-juice-powders" category and delete all its products.
--
-- Safe to run multiple times (idempotent behavior).
-- ====================================================================================

begin;

-- ------------------------------------------------------------
-- 1) Reassign products to merged categories
-- ------------------------------------------------------------
update public.products
set category_id = 'herbal-extracts'
where category_id = 'phytochemicals';

update public.products
set category_id = 'nutraceuticals'
where category_id = 'amino-acids';

-- ------------------------------------------------------------
-- 2) Remove Fruit Juice Powders products entirely
-- ------------------------------------------------------------
delete from public.products
where category_id = 'fruit-juice-powders';

-- ------------------------------------------------------------
-- 3) Remove deprecated categories
-- ------------------------------------------------------------
delete from public.product_categories
where id in ('phytochemicals', 'amino-acids', 'fruit-juice-powders');

-- ------------------------------------------------------------
-- 3b) Rename merged target category for website display
-- ------------------------------------------------------------
update public.product_categories
set name = 'Herbal Extracts'
where id = 'herbal-extracts';

-- ------------------------------------------------------------
-- 4) Recompute category product_count from current products
-- ------------------------------------------------------------
update public.product_categories pc
set product_count = coalesce(src.cnt, 0)
from (
  select category_id, count(*)::int as cnt
  from public.products
  group by category_id
) src
where pc.id = src.category_id;

update public.product_categories pc
set product_count = 0
where not exists (
  select 1
  from public.products p
  where p.category_id = pc.id
);

-- ------------------------------------------------------------
-- 5) Recompute example_products (top 3 by popularity then name)
-- ------------------------------------------------------------
update public.product_categories pc
set example_products = coalesce(src.examples, array[]::text[])
from (
  select
    category_id,
    (array_agg(name order by coalesce(popularity, 0) desc, name asc))[1:3] as examples
  from public.products
  group by category_id
) src
where pc.id = src.category_id;

update public.product_categories pc
set example_products = array[]::text[]
where not exists (
  select 1
  from public.products p
  where p.category_id = pc.id
);

commit;

-- ====================================================================================
-- Verification queries (run after script)
-- ====================================================================================
-- select id, name, product_count from public.product_categories order by name;
--
-- select category_id, count(*) as products
-- from public.products
-- group by category_id
-- order by category_id;
--
-- select count(*) from public.products where category_id in ('phytochemicals', 'amino-acids', 'fruit-juice-powders');
-- (Expected: 0)
