import { createSupabaseServiceClient } from "@/lib/supabase-service";
import ProductsClient from "./ProductsClient";

async function getInitialData() {
  const supabase = createSupabaseServiceClient();

  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, category_id, botanical_name, active_ingredient, active_compound, concentration, applications, description, image_path, quality_badges, is_halal, popularity, product_categories(id, name, slug)"
      )
      .order("name", { ascending: true })
      .range(0, 24),
    supabase
      .from("product_categories")
      .select("id, name, slug")
      .order("name", { ascending: true }),
  ]);

  return {
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
  };
}

export const metadata = {
  title: "Products — PuraVida Admin",
};

export default async function ProductsPage() {
  const { products, categories } = await getInitialData();

  return <ProductsClient initialProducts={products} categories={categories} />;
}
