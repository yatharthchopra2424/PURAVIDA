/**
 * Shared bootstrap for every scripts/leads/* CLI.
 *
 * tsx does not auto-load dotenv files, and this project keeps real
 * secrets in `.env.local` (gitignored) with `.env` as the older
 * fallback. Both are tried, first-found-wins per key, so an existing
 * `.env` keeps working while new keys land in `.env.local`.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ENV_FILES = [".env.local", ".env"];

let loaded = false;

/** Populates process.env from .env.local / .env without overwriting real env vars. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  for (const file of ENV_FILES) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;

    for (const rawLine of fs.readFileSync(full, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const eq = line.indexOf("=");
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;

      let value = line.slice(eq + 1).trim();
      // Tolerate quoted values — SMTP passwords often contain spaces.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Unescape `\$` the same way Next.js does.
      //
      // Next runs .env files through dotenv-expand, which reads `$NAME`
      // as a variable reference and substitutes it away — so a password
      // containing a dollar sign arrives at the app shorter than it is
      // on disk, and the only symptom is `535 Authentication Failed`
      // from credentials that are provably correct. The fix is to
      // backslash-escape the dollar (quoting does not help; dotenv
      // strips quotes before expansion runs), and this loader has to
      // honour that escape too — otherwise the CLI and the app would
      // read two different passwords out of one file, which is exactly
      // the confusion the escape was added to end.
      value = value.replace(/\\\$/g, "$");

      process.env[key] = value;
    }
  }
}

/** Reads a required env var, failing loudly rather than at the first API call. */
export function requireEnv(name: string): string {
  loadEnv();
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(
      `\n  Missing ${name}.\n  Add it to .env.local, then re-run.\n`
    );
    process.exit(1);
  }
  return value;
}

/** Service-role Supabase client. Scripts run outside the request cycle, so RLS is bypassed. */
export function serviceClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Minimal `--flag value` / `--flag=value` / `--bool` parser. */
export function parseArgs(argv: string[] = process.argv.slice(2)) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const eq = arg.indexOf("=");
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[arg.slice(2)] = next;
      i++;
    } else {
      out[arg.slice(2)] = true;
    }
  }
  return out;
}
