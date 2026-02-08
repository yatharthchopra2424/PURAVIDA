import fs from "fs";
import path from "path";
import { categories } from "../src/data/categories";
import { products } from "../src/data/products";

type SqlValue = string | number | boolean | null | undefined;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toStorageKey = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const safeBase = normalize(base).replace(/-+/g, "-");
  return `${safeBase}${ext}`;
};

const sqlString = (value: SqlValue) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replace(/'/g, "''")}'`;
};

const sqlTextArray = (values?: string[]) => {
  if (!values || values.length === 0) return "array[]::text[]";
  return `array[${values.map((value) => sqlString(value)).join(", ")}]`;
};

const imagesDir = path.join(process.cwd(), "public", "product_images");
const imageFiles = fs.existsSync(imagesDir)
  ? fs
      .readdirSync(imagesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  : [];

const imageSlugToFile = new Map<string, string>();
for (const file of imageFiles) {
  const basename = path.parse(file).name;
  const slug = normalize(basename);
  if (!imageSlugToFile.has(slug)) {
    imageSlugToFile.set(slug, toStorageKey(file));
  }
}

const findImageForProduct = (productSlug: string, productName: string) => {
  const slugCandidates = [normalize(productSlug), normalize(productName)];
  for (const slug of slugCandidates) {
    const exact = imageSlugToFile.get(slug);
    if (exact) return exact;
  }

  const target = normalize(productSlug);
  for (const [slug, file] of imageSlugToFile.entries()) {
    if (slug.includes(target) || target.includes(slug)) {
      return file;
    }
  }

  return null;
};

const categoryRows = categories.map((category) =>
  `(${sqlString(category.id)}, ${sqlString(category.name)}, ${sqlString(
    category.slug
  )}, ${sqlString(category.label)}, ${sqlString(
    category.description
  )}, ${sqlString(category.image)}, ${sqlTextArray(
    category.subcategories
  )}, ${sqlTextArray(category.exampleProducts)}, ${sqlString(
    category.productCount
  )})`
);

const categoryInsert = `insert into public.product_categories (
  id,
  name,
  slug,
  label,
  description,
  image,
  subcategories,
  example_products,
  product_count
)
values
${categoryRows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  label = excluded.label,
  description = excluded.description,
  image = excluded.image,
  subcategories = excluded.subcategories,
  example_products = excluded.example_products,
  product_count = excluded.product_count;
`;

const productRows = products.map((product) => {
  const imageFile = findImageForProduct(product.slug, product.name);
  return `(${sqlString(product.id)}, ${sqlString(product.name)}, ${sqlString(
    product.slug
  )}, ${sqlString(product.categorySlug)}, ${sqlString(
    product.botanicalName
  )}, ${sqlString(product.activeIngredient)}, ${sqlString(
    product.activeCompound
  )}, ${sqlString(product.concentration)}, ${sqlTextArray(
    product.applications
  )}, ${sqlString(product.description)}, ${sqlString(
    imageFile
  )}, ${sqlTextArray(product.qualityBadges)}, ${sqlString(
    product.isHalal
  )}, ${sqlString(product.popularity)})`;
});

const productInsert = `insert into public.products (
  id,
  name,
  slug,
  category_id,
  botanical_name,
  active_ingredient,
  active_compound,
  concentration,
  applications,
  description,
  image_path,
  quality_badges,
  is_halal,
  popularity
)
values
${productRows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  category_id = excluded.category_id,
  botanical_name = excluded.botanical_name,
  active_ingredient = excluded.active_ingredient,
  active_compound = excluded.active_compound,
  concentration = excluded.concentration,
  applications = excluded.applications,
  description = excluded.description,
  image_path = excluded.image_path,
  quality_badges = excluded.quality_badges,
  is_halal = excluded.is_halal,
  popularity = excluded.popularity;
`;

const output = ["-- Categories", categoryInsert, "-- Products", productInsert].join(
  "\n\n"
);

const outPath = path.join(process.cwd(), "scripts", "supabase-seed.sql");
fs.writeFileSync(outPath, output, "utf8");

console.log(`Seed SQL written to ${outPath}`);
console.log(`Images matched: ${products.filter((p) => findImageForProduct(p.slug, p.name)).length} / ${products.length}`);
