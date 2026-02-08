import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const IMAGES_DIR = path.join(PROJECT_ROOT, "public", "product_images");
const BUCKET = "product-images";

const loadEnv = () => {
  if (!fs.existsSync(ENV_PATH)) return;
  const content = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key || rest.length === 0) continue;
    if (process.env[key] === undefined) {
      process.env[key] = rest.join("=");
    }
  }
};

const contentTypeForFile = (file: string) => {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
};

const normalizeKey = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${safeBase}${ext}`;
};

const uploadFile = async (supabaseUrl: string, serviceKey: string, filePath: string) => {
  const fileName = path.basename(filePath);
  const storageKey = normalizeKey(fileName);
  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(storageKey)}`;
  const body = fs.readFileSync(filePath);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "x-upsert": "true",
      "Content-Type": contentTypeForFile(fileName),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${storageKey}: ${response.status} ${response.statusText} - ${text}`);
  }
};

const main = async () => {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`Images folder not found: ${IMAGES_DIR}`);
  }

  const files = fs
    .readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(IMAGES_DIR, entry.name));

  let uploaded = 0;
  for (const filePath of files) {
    await uploadFile(supabaseUrl, serviceKey, filePath);
    uploaded += 1;
    process.stdout.write(`Uploaded ${uploaded}/${files.length}: ${path.basename(filePath)}\n`);
  }

  console.log(`Uploaded ${uploaded} images to ${BUCKET}.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
