import fs from "fs";
import path from "path";

const CSV_PATH = path.join(process.cwd(), "public", "protucts.csv");
const OUTPUT_PATH = path.join(process.cwd(), "scripts", "csv-products-seed.sql");
const IMAGES_DIR = path.join(process.cwd(), "public", "product_images");

const categoryMap: Record<string, string> = {
  "Standardized Herbal Extracts": "herbal-extracts",
  "Essential Oils": "essential-oils",
  Oleoresins: "oleoresins",
  "Fruit Juice Powders": "fruit-juice-powders",
  Phytochemicals: "phytochemicals",
  "Amino Acids": "amino-acids",
  Nutraceuticals: "nutraceuticals",
};

type CsvRow = {
  category: string;
  name: string;
  botanicalName: string;
  activeIngredient: string;
  primaryApplication: string;
};

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
  if (value === null || value === undefined || value === "") return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replace(/'/g, "''")}'`;
};

const sqlTextArray = (values?: string[]) => {
  if (!values || values.length === 0) return "array[]::text[]";
  return `array[${values.map((value) => sqlString(value)).join(", ")}]`;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const parseCsv = (content: string): CsvRow[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((value) => value.trim());
  const required = [
    "Category",
    "Product Name",
    "Botanical Name / Source",
    "Active Ingredient",
    "Primary Application",
  ];

  for (const column of required) {
    if (!header.includes(column)) {
      throw new Error(`Missing column: ${column}`);
    }
  }

  const index = (name: string) => header.indexOf(name);

  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    return {
      category: fields[index("Category")]?.trim() ?? "",
      name: fields[index("Product Name")]?.trim() ?? "",
      botanicalName: fields[index("Botanical Name / Source")]?.trim() ?? "",
      activeIngredient: fields[index("Active Ingredient")]?.trim() ?? "",
      primaryApplication: fields[index("Primary Application")]?.trim() ?? "",
    };
  });
};

const images = fs.existsSync(IMAGES_DIR)
  ? fs
      .readdirSync(IMAGES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  : [];

const imageSlugToFile = new Map<string, string>();
for (const file of images) {
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

const csvContent = fs.readFileSync(CSV_PATH, "utf8");
const rows = parseCsv(csvContent);

const productsBySlug = new Map<string, CsvRow>();
for (const row of rows) {
  if (!row.name) continue;
  const slug = normalize(row.name);
  if (!productsBySlug.has(slug)) {
    productsBySlug.set(slug, row);
  }
}

let matchedImages = 0;
const productRows = Array.from(productsBySlug.entries()).map(([slug, row]) => {
  const categoryId = categoryMap[row.category] ?? normalize(row.category);
  const applications = row.primaryApplication
    ? row.primaryApplication.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  const imageFile = findImageForProduct(slug, row.name);
  if (imageFile) matchedImages += 1;

  return `(${sqlString(slug)}, ${sqlString(row.name)}, ${sqlString(
    slug
  )}, ${sqlString(categoryId)}, ${sqlString(
    row.botanicalName
  )}, ${sqlString(row.activeIngredient)}, null, null, ${sqlTextArray(
    applications
  )}, null, ${sqlString(imageFile)}, array[]::text[], null, null)`;
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
on conflict (slug) do update set
  name = excluded.name,
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

fs.writeFileSync(OUTPUT_PATH, productInsert, "utf8");

console.log(`CSV rows: ${rows.length}`);
console.log(`Products inserted: ${productRows.length}`);
console.log(`Images matched: ${matchedImages}`);
console.log(`Seed SQL written to ${OUTPUT_PATH}`);
