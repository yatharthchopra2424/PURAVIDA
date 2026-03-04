import { Category, Product, QualityBadge } from "@/types";
import { getProductImageUrl, getSupabaseServerClient } from "@/lib/supabase";

const FALLBACK_IMAGE = "/images/Product%20Card%20Backgrounds.png";
const FALLBACK_DESCRIPTION = "Details coming soon.";

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
  image: row.image || FALLBACK_IMAGE,
  subcategories: row.subcategories || [],
  exampleProducts: row.example_products || [],
  productCount: row.product_count ?? 0,
});

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
    description: row.description || FALLBACK_DESCRIPTION,
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
  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase.from("product_categories").select("*").order("name"),
      supabase
        .from("products")
        .select("*")
        .eq("category_id", categorySlug)
        .order("name"),
    ]);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (productError) {
    throw new Error(productError.message);
  }

  const categories = (categoryRows as CategoryRow[]).map(mapCategoryRow);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (productRows as ProductRow[]).map((row) => mapProductRow(row, categoryMap));
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

export const searchProducts = async (query: string, limit = 60): Promise<Product[]> => {
  const supabase = getSupabaseServerClient();
  
  if (!query || query.trim().length < 1) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  if (!normalizedQuery) {
    return [];
  }
  
  // Get categories once
  const { data: categoryRows, error: categoryError } = await supabase
    .from("product_categories")
    .select("id, name, slug");

  if (categoryError) {
    console.error("Category fetch error:", categoryError);
    throw new Error(categoryError.message);
  }

  // Pull a broad candidate set and score in-memory for robust multi-field matching.
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, name, slug, category_id, botanical_name, active_ingredient, active_compound, concentration, applications, description, image_path, quality_badges, is_halal, popularity")
    .order("popularity", { ascending: false })
    .limit(2000);

  if (productError) {
    console.error("Product search error:", productError);
    throw new Error(productError.message);
  }

  const categories = (categoryRows as CategoryRow[]).map(mapCategoryRow);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

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
