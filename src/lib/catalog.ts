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

export const searchProducts = async (query: string, limit = 24): Promise<Product[]> => {
  const supabase = getSupabaseServerClient();
  
  if (!query || query.trim().length < 1) {
    return [];
  }

  const searchQuery = `%${query.toLowerCase()}%`;
  
  // Get categories once
  const { data: categoryRows, error: categoryError } = await supabase
    .from("product_categories")
    .select("id, name, slug");

  if (categoryError) {
    console.error("Category fetch error:", categoryError);
    throw new Error(categoryError.message);
  }

  // Perform optimized search with LOWER() for case-insensitive matching
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, name, slug, category_id, botanical_name, active_ingredient, active_compound, concentration, applications, description, image_path, quality_badges, is_halal, popularity")
    .or(`name.ilike.${searchQuery},botanical_name.ilike.${searchQuery},active_ingredient.ilike.${searchQuery},active_compound.ilike.${searchQuery}`, { foreignTable: undefined })
    .order("popularity", { ascending: false })
    .limit(limit);

  if (productError) {
    console.error("Product search error:", productError);
    throw new Error(productError.message);
  }

  const categories = (categoryRows as CategoryRow[]).map(mapCategoryRow);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (productRows as ProductRow[]).map((row) => mapProductRow(row, categoryMap));
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
