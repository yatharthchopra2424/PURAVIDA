import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * True when this session has signed in with a password but still owes the
 * second factor: the account has a verified TOTP factor (nextLevel aal2)
 * and the session hasn't proven it yet (currentLevel aal1).
 *
 * Read from the session JWT, so it costs no extra network round trip.
 * Accounts without a factor are unaffected until they enrol one in
 * Settings → Two-factor authentication.
 */
export async function needsSecondFactor(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}
