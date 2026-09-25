/**
 * admin-reset-2fa.ts: removes the two-factor authenticator from an admin
 * account, for when the phone is lost. Needs the service-role key, so it
 * can only be run by someone who already controls the server.
 *
 *   npx tsx scripts/admin-reset-2fa.ts you@puravidanaturalindia.com
 *
 * Sign in with the password afterwards and turn two-factor on again in
 * Settings.
 */
import { loadEnv, serviceClient } from "./leads/_env";

loadEnv();
(async () => {
  const email = process.argv[2]?.toLowerCase();
  if (!email) {
    console.error("\n  Usage: npx tsx scripts/admin-reset-2fa.ts <admin email>\n");
    process.exit(1);
  }
  const supabase = serviceClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.error(`\n  No account for ${email}.\n`);
    process.exit(1);
  }
  const { data: factors, error: fErr } = await supabase.auth.admin.mfa.listFactors({ userId: user.id });
  if (fErr) throw fErr;
  if (!factors.factors.length) return console.log(`\n  ${email} has no two-factor authenticator. Nothing to do.\n`);
  for (const f of factors.factors) {
    const { error: dErr } = await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    console.log(dErr ? `  failed to remove ${f.id}: ${dErr.message}` : `  removed ${f.factor_type} factor ${f.id}`);
  }
  console.log(`\n  Done. ${email} can sign in with the password alone until two-factor is turned on again.\n`);
})();
