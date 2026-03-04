/**
 * create-admin-user.ts
 * Run with: pnpm tsx scripts/create-admin-user.ts
 *
 * Creates (or updates) an admin user in Supabase Auth.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually (tsx doesn't auto-load it)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  .env.local not found at project root");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n🌿  PuraVida Admin User Setup\n");

  const email = await ask("Admin email: ");
  const password = await ask("Admin password (min 8 chars): ");
  rl.close();

  if (!email || !password) {
    console.error("❌  Email and password are required.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌  Password must be at least 8 characters.");
    process.exit(1);
  }

  console.log("\n⏳  Creating admin user in Supabase Auth...");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification for admin
    user_metadata: { role: "admin", created_by: "seed-script" },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log("ℹ️   User already exists. Updating password...");
      // Find user by email first
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("❌  Failed to list users:", listError.message);
        process.exit(1);
      }
      const existing = listData.users.find((u) => u.email === email);
      if (!existing) {
        console.error("❌  Could not find existing user.");
        process.exit(1);
      }
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        { password, email_confirm: true }
      );
      if (updateError) {
        console.error("❌  Failed to update user:", updateError.message);
        process.exit(1);
      }
      console.log(`\n✅  Admin user updated successfully!`);
      console.log(`   Email: ${email}`);
      console.log(`   Login: http://localhost:3000/x-admin/login\n`);
    } else {
      console.error("❌  Failed to create user:", error.message);
      process.exit(1);
    }
    return;
  }

  console.log(`\n✅  Admin user created successfully!`);
  console.log(`   Email: ${data.user.email}`);
  console.log(`   ID:    ${data.user.id}`);
  console.log(`   Login: http://localhost:3000/x-admin/login\n`);
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
