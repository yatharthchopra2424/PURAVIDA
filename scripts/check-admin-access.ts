/**
 * check-admin-access.ts — why "This account is not authorized" happens.
 *
 *   npm run admin:check
 *
 * Admin access needs two independent things to line up, and the login
 * screen cannot tell you which one is missing:
 *
 *   1. a user in Supabase Auth, so the password works at all;
 *   2. that same address in ADMIN_EMAILS, because a valid session
 *      grants nothing on its own.
 *
 * Signing in successfully and then being told you are not authorized
 * means (1) passed and (2) failed — almost always because the account
 * that exists is at a different address from the one on the list. This
 * prints both sides so the mismatch is obvious.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./leads/_env";
import { getAdminEmails } from "../src/lib/admin-allowlist";

async function main() {
  loadEnv();

  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const allowlist = getAdminEmails();

  console.log("\n  ADMIN_EMAILS (who is allowed in)");
  if (allowlist.length === 0) {
    console.log("    (empty — every account is denied)");
  } else {
    for (const email of allowlist) console.log(`    ${email}`);
  }

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });

  if (error) {
    console.error(`\n  Could not list Supabase users: ${error.message}\n`);
    process.exit(1);
  }

  const users = data.users
    .map((u) => ({
      email: (u.email ?? "").toLowerCase(),
      confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      lastSignIn: u.last_sign_in_at,
    }))
    .filter((u) => u.email);

  console.log("\n  Supabase Auth accounts (who can sign in)");
  if (users.length === 0) {
    console.log("    (none — create one with npm run admin:create)");
  }
  for (const user of users) {
    const allowed = allowlist.includes(user.email);
    const flags = [
      allowed ? "ADMIN" : "no admin access",
      user.confirmed ? "confirmed" : "UNCONFIRMED",
      user.lastSignIn
        ? `last sign-in ${new Date(user.lastSignIn).toISOString().slice(0, 10)}`
        : "never signed in",
    ];
    console.log(`    ${user.email}  —  ${flags.join(" · ")}`);
  }

  // The two failure modes, named.
  const orphanedAllowlist = allowlist.filter(
    (email) => !users.some((u) => u.email === email)
  );
  const usable = users.filter((u) => allowlist.includes(u.email));

  console.log("");

  if (orphanedAllowlist.length) {
    console.log("  On the allowlist but has no account to sign in with:");
    for (const email of orphanedAllowlist) console.log(`    ${email}`);
    console.log("    Fix:  npm run admin:create   (use exactly this address)\n");
  }

  if (usable.length === 0) {
    console.log("  No account can currently reach the admin panel.\n");
    process.exit(1);
  }

  console.log(`  ${usable.length} account(s) can reach /x-admin:`);
  for (const user of usable) console.log(`    ${user.email}`);

  console.log(
    "\n  Note: this reads your local .env.local. Production uses Vercel's" +
      "\n  environment variables — check ADMIN_EMAILS there separately.\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
