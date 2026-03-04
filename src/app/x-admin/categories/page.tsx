import { createSupabaseServiceClient } from "@/lib/supabase-service";
import CategoriesClient from "./CategoriesClient";

async function getCategories() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("product_categories")
    .select(
      "id, name, slug, label, description, image, subcategories, example_products, product_count"
    )
    .order("name", { ascending: true });

  return data ?? [];
}

export const metadata = {
  title: "Categories — PuraVida Admin",
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  return <CategoriesClient initialCategories={categories} />;
}
