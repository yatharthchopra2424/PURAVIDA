import { Category, Product, QualityBadge } from "@/types";
import { getProductImageUrl, getSupabaseServerClient } from "@/lib/supabase";
import { PRODUCT_FALLBACK_IMAGE as FALLBACK_IMAGE } from "@/lib/constants";
/**
 * Description for products that have none yet (243 of 256 in Sep 2026).
 *
 * "Details coming soon." was shown to buyers, used as the meta description
 * and put in the Product schema, and Google Search Console reported 212
 * product pages as "Discovered, currently not indexed": thin pages it
 * didn't think worth crawling. This builds two factual sentences from the
 * fields every product already has (botanical name, active ingredient with
 * its standardisation and test method, application areas), so nothing is
 * invented. A description written in the admin always takes precedence.
 */
function buildDescription(row: ProductRow, categoryName: string | undefined): string {
  const name = row.name.trim();
  const botanical = row.botanical_name?.trim();
  const active = (row.concentration ? `${row.active_ingredient} ${row.concentration}` : row.active_ingredient)?.trim();
  const apps = (row.applications ?? []).filter(Boolean).slice(0, 4);
  const cat = (categoryName ?? "").toLowerCase();

  const from = botanical ? ` from ${botanical}` : "";
  let first: string;
  if (cat.includes("essential")) {
    first = `${name} is an essential oil${from}${active ? `, with ${active} as its key constituents` : ""}.`;
  } else if (cat.includes("oleoresin")) {
    first = `${name} is a concentrated oleoresin${from}${active ? `, characterised by ${active}` : ""}.`;
  } else if (cat.includes("nutraceutical")) {
    first = `${name} is a nutraceutical ingredient${from}${active ? ` (${active})` : ""} for dietary supplements and functional foods.`;
  } else {
    first = `${name} is a standardised herbal extract${from}${active ? `, standardised to ${active}` : ""}.`;
  }
  const uses = apps.length ? ` Typical application areas: ${apps.join(", ")}.` : "";
  return `${first}${uses} PuraVida Natural supplies ${name} in bulk from New Delhi to manufacturers and brands in India and for export, with a certificate of analysis for each batch on request.`;
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  label: string | null;
  description: string | null;
  image: string | null;
  subcategories: string[] | null;
  example_products: string[] | null;
  product_count: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  botanical_name: string | null;
  active_ingredient: string | null;
  active_compound: string | null;
  concentration: string | null;
  applications: string[] | null;
  description: string | null;
  image_path: string | null;
  quality_badges: QualityBadge[] | null;
  is_halal: boolean | null;
  popularity: number | null;
};

const mapCategoryRow = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  label: row.label || row.name,
  description: row.description || "",
  image: resolveCategoryImage(row.image),
  subcategories: row.subcategories || [],
  exampleProducts: row.example_products || [],
  productCount: row.product_count ?? 0,
});

/**
 * Categories store either a bare storage key (e.g. "category-oleoresins.jpg",
 * same convention as products' image_path) or a legacy local path like
 * "/images/Product%20Card%20Backgrounds.png". Unlike products, this never
 * went through getProductImageUrl — invisible while every category used
 * the same local fallback, but a bare key resolves to a broken same-origin
 * URL instead of the Supabase Storage object it actually is.
 */
function resolveCategoryImage(image: string | null): string {
  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("/") || image.startsWith("http")) return image;
  return getProductImageUrl(image);
}

const mapProductRow = (
  row: ProductRow,
  categoryMap: Map<string, Category>
): Product => {
  const category = categoryMap.get(row.category_id);
  return {
    id: row.id || row.slug,
    name: row.name,
    slug: row.slug,
    category: category?.name || row.category_id,
    categorySlug: category?.slug || row.category_id,
    botanicalName: row.botanical_name || undefined,
    activeIngredient: row.active_ingredient || undefined,
    activeCompound: row.active_compound || undefined,
    concentration: row.concentration || undefined,
    applications: row.applications || [],
    description: row.description?.trim() || buildDescription(row, category?.name),
    image: row.image_path ? getProductImageUrl(row.image_path) : FALLBACK_IMAGE,
    qualityBadges: row.quality_badges || [],
    isHalal: row.is_halal ?? false,
    popularity: row.popularity ?? 0,
  };
};

export const fetchCategories = async (): Promise<Category[]> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data as CategoryRow[]).map(mapCategoryRow);
};

export const fetchCatalogSnapshot = async () => {
  const supabase = getSupabaseServerClient();
  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase.from("product_categories").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
    ]);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (productError) {
    throw new Error(productError.message);
  }

  const categories = (categoryRows as CategoryRow[]).map(mapCategoryRow);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const products = (productRows as ProductRow[]).map((row) => mapProductRow(row, categoryMap));

  return { categories, products };
};

export const fetchProductsByCategory = async (
  categorySlug: string
): Promise<Product[]> => {
  const supabase = getSupabaseServerClient();

  const { data: categoryRows, error: categoryError } = await supabase
    .from("product_categories")
    .select("*")
    .order("name");

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const categories = (categoryRows as CategoryRow[]).map(mapCategoryRow);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  // products.category_id currently stores the category slug (the seed
  // sets product_categories.id = slug). Resolve via the category row
  // rather than assuming that, so this keeps working if ids become
  // UUIDs later.
  const category = categories.find((entry) => entry.slug === categorySlug);
  if (!category) {
    return [];
  }

  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", category.id)
    .order("name");

  if (productError) {
    throw new Error(productError.message);
  }

  return (productRows as ProductRow[]).map((row) => mapProductRow(row, categoryMap));
};

export const fetchCategoryBySlug = async (
  slug: string
): Promise<Category | null> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("slug", slug)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = (data as CategoryRow[])[0];
  return row ? mapCategoryRow(row) : null;
};

export const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  const supabase = getSupabaseServerClient();
  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase.from("product_categories").select("*"),
      supabase.from("products").select("*").eq("slug", slug).limit(1),
    ]);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (productError) {
    throw new Error(productError.message);
  }

  const categories = (categoryRows as CategoryRow[]).map(mapCategoryRow);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const product = (productRows as ProductRow[])[0];

  return product ? mapProductRow(product, categoryMap) : null;
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9%+\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildSearchHaystack = (row: ProductRow, categoryName?: string) =>
  normalizeSearchText(
    [
      row.name,
      row.slug,
      categoryName,
      row.botanical_name,
      row.active_ingredient,
      row.active_compound,
      row.concentration,
      row.description,
      ...(row.applications || []),
    ]
      .filter(Boolean)
      .join(" ")
  );

const getSearchScore = (
  row: ProductRow,
  categoryName: string | undefined,
  normalizedQuery: string,
  tokens: string[]
) => {
  const name = normalizeSearchText(row.name || "");
  const slug = normalizeSearchText(row.slug || "");
  const botanical = normalizeSearchText(row.botanical_name || "");
  const ingredient = normalizeSearchText(row.active_ingredient || "");
  const compound = normalizeSearchText(row.active_compound || "");
  const description = normalizeSearchText(row.description || "");
  const category = normalizeSearchText(categoryName || "");
  const applications = (row.applications || []).map((item) =>
    normalizeSearchText(item)
  );
  const haystack = buildSearchHaystack(row, categoryName);

  const phraseMatch = haystack.includes(normalizedQuery);
  const tokenMatch = tokens.length > 0 && tokens.every((token) => haystack.includes(token));

  if (!phraseMatch && !tokenMatch) {
    return 0;
  }

  let score = 0;

  if (name === normalizedQuery) score += 400;
  if (applications.some((app) => app === normalizedQuery)) score += 300;
  if (slug === normalizedQuery) score += 240;
  if (ingredient === normalizedQuery || compound === normalizedQuery) score += 220;
  if (botanical === normalizedQuery) score += 200;

  if (name.includes(normalizedQuery)) score += 160;
  if (applications.some((app) => app.includes(normalizedQuery))) score += 150;
  if (ingredient.includes(normalizedQuery) || compound.includes(normalizedQuery)) score += 130;
  if (botanical.includes(normalizedQuery)) score += 110;
  if (category.includes(normalizedQuery)) score += 90;
  if (description.includes(normalizedQuery)) score += 70;

  for (const token of tokens) {
    if (name.includes(token)) score += 28;
    if (applications.some((app) => app.includes(token))) score += 24;
    if (ingredient.includes(token) || compound.includes(token)) score += 20;
    if (botanical.includes(token)) score += 16;
    if (description.includes(token)) score += 10;
    if (category.includes(token)) score += 8;
  }

  if (tokenMatch) score += 50;
  score += Math.min(row.popularity ?? 0, 100) / 5;

  return score;
};

const buildCategoryMap = async (): Promise<Map<string, Category>> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  const categories = (data as CategoryRow[]).map(mapCategoryRow);
  return new Map(categories.map((category) => [category.id, category]));
};

/**
 * Legacy in-memory search.
 *
 * Retained only as a fallback for when the Postgres RPC is missing —
 * i.e. scripts/search-fulltext.sql has not been run yet. It pulls a
 * broad candidate set and scores in Node, which is exactly the
 * behaviour P1-7 replaced, so it should never be the steady state.
 */
const searchProductsInMemory = async (
  query: string,
  limit: number
): Promise<Product[]> => {
  const supabase = getSupabaseServerClient();

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  const categoryMap = await buildCategoryMap();

  const { data: productRows, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, category_id, botanical_name, active_ingredient, active_compound, concentration, applications, description, image_path, quality_badges, is_halal, popularity"
    )
    .order("popularity", { ascending: false })
    .limit(2000);

  if (error) {
    throw new Error(error.message);
  }

  return (productRows as ProductRow[])
    .map((row) => {
      const category = categoryMap.get(row.category_id);
      const score = getSearchScore(row, category?.name, normalizedQuery, tokens);
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.row.popularity ?? 0) - (a.row.popularity ?? 0);
    })
    .slice(0, Math.max(1, limit))
    .map((entry) => mapProductRow(entry.row, categoryMap));
};

/**
 * Product search, ranked in Postgres.
 *
 * Calls the search_products RPC (scripts/search-fulltext.sql), which
 * combines a GIN-indexed tsvector with trigram similarity so both
 * stemming and typos are handled, and returns only the rows needed.
 *
 * Falls back to the old in-memory path if the RPC is absent, so the
 * site keeps working before the migration is applied.
 */
export const searchProducts = async (
  query: string,
  limit = 60
): Promise<Product[]> => {
  const trimmed = query?.trim() ?? "";
  if (!trimmed) return [];

  const safeLimit = Math.min(Math.max(1, limit), 200);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.rpc("search_products", {
    search_query: trimmed,
    result_limit: safeLimit,
  });

  if (error) {
    // 42883 = undefined_function, PGRST202 = RPC not found in schema cache.
    const migrationMissing =
      error.code === "42883" ||
      error.code === "PGRST202" ||
      /search_products/i.test(error.message ?? "");

    if (migrationMissing) {
      console.warn(
        "[catalog] search_products RPC not found — falling back to in-memory " +
          "search. Run scripts/search-fulltext.sql to enable indexed search."
      );
      return searchProductsInMemory(trimmed, safeLimit);
    }

    console.error("[catalog] search_products RPC failed", error);
    throw new Error(error.message);
  }

  const categoryMap = await buildCategoryMap();
  return (data as ProductRow[]).map((row) => mapProductRow(row, categoryMap));
};

export const fetchProductNames = async (limit = 500) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .order("name")
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Array<{ id: string; name: string }>;
};
