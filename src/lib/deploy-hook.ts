/**
 * Triggers a Vercel Deploy Hook so catalog changes go live.
 *
 * WHY THIS EXISTS
 * The product and category routes use `dynamicParams = false`, which is
 * what makes an unknown slug return a real HTTP 404 instead of a 200
 * carrying a "not found" page. The cost is that the list of valid paths
 * is fixed at build time by generateStaticParams — so a product added
 * through the admin panel has no page until the site rebuilds.
 *
 * This closes that gap: create, update or delete a product or category
 * and a rebuild is requested automatically. New pages are live in about
 * a minute without anyone opening the Vercel dashboard.
 *
 * SETUP
 *   Vercel → Project → Settings → Git → Deploy Hooks → Create Hook
 *   Name it e.g. "catalog-change", target your production branch, then
 *   set the generated URL as VERCEL_DEPLOY_HOOK_URL.
 *
 * If the variable is unset the app behaves exactly as before, minus the
 * automatic rebuild — nothing breaks, so local development and preview
 * environments need no configuration.
 */

/** Rebuilds are coarse; this stops a burst of edits firing many builds. */
const MIN_INTERVAL_MS = 60_000;
let lastTriggeredAt = 0;

export type DeployHookResult =
  | { triggered: true }
  | { triggered: false; reason: "not_configured" | "debounced" | "failed" };

export async function triggerDeploy(
  reason: string
): Promise<DeployHookResult> {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!url) {
    return { triggered: false, reason: "not_configured" };
  }

  const now = Date.now();
  if (now - lastTriggeredAt < MIN_INTERVAL_MS) {
    console.info(
      `[deploy-hook] Skipped (${reason}) — a rebuild was requested less than ` +
        `${MIN_INTERVAL_MS / 1000}s ago and will pick up this change.`
    );
    return { triggered: false, reason: "debounced" };
  }

  try {
    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
      console.error(
        `[deploy-hook] Failed (${reason}): ${response.status} ${response.statusText}`
      );
      return { triggered: false, reason: "failed" };
    }

    lastTriggeredAt = now;
    console.info(`[deploy-hook] Rebuild requested (${reason}).`);
    return { triggered: true };
  } catch (error) {
    // Never fail the admin action because the rebuild could not be
    // queued — the content change itself already succeeded.
    console.error(`[deploy-hook] Request threw (${reason})`, error);
    return { triggered: false, reason: "failed" };
  }
}
