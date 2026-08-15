/**
 * Admin allowlist — pure helpers, no Next.js server imports.
 *
 * Deliberately kept free of `next/headers` and `next/server` so this
 * module is safe to import from Edge middleware, Server Components,
 * and Route Handlers alike.
 *
 * Set ADMIN_EMAILS as a comma-separated list in .env and in Vercel:
 *   ADMIN_EMAILS=ps@puravidanaturalindia.com,second@example.com
 */

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * A valid Supabase session is NOT sufficient for admin access.
 * Supabase enables email signup by default, so without this check
 * anyone who registers an account would gain full CRUD over the
 * catalog and the customer inquiry inbox.
 *
 * Fails closed: an empty or missing ADMIN_EMAILS denies everyone.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;

  const allowlist = getAdminEmails();

  if (allowlist.length === 0) {
    console.error(
      "[admin-allowlist] ADMIN_EMAILS is empty — denying all admin access. " +
        "Set ADMIN_EMAILS in your environment."
    );
    return false;
  }

  return allowlist.includes(email.toLowerCase());
}
