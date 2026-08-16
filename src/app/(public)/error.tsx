"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Route-level error boundary.
 *
 * Every page in this app reads from Supabase at request time, so a
 * paused project, a network blip, or a rate limit would otherwise
 * surface as an unstyled Next.js error screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with Sentry.captureException(error) once observability
    // lands (P2-8). Note: next.config.mjs strips console in production,
    // so this is a development aid only.
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 pb-20 pt-[11rem] lg:pt-[13rem]">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          We hit a problem loading this page. This is usually temporary —
          please try again in a moment.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Need help right away? Email{" "}
          <a
            href="mailto:ps@puravidanaturalindia.com"
            className="font-medium text-emerald hover:underline"
          >
            ps@puravidanaturalindia.com
          </a>
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-gray-400">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
