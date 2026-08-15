import { NextResponse } from "next/server";
import { fetchCategories } from "@/lib/catalog";

// Categories change rarely — there is no reason for this to be
// uncacheable. It was `force-dynamic` + `revalidate = 0` + `no-store`,
// so every navigation hit Supabase afresh.
export const revalidate = 3600;

export async function GET() {
	try {
		const categories = await fetchCategories();

		return NextResponse.json(categories, {
			headers: {
				"Cache-Control":
					"public, s-maxage=3600, stale-while-revalidate=86400",
			},
		});
	} catch (error) {
		console.error("[catalog/categories] fetch failed", error);
		const message =
			error instanceof Error ? error.message : "Failed to load categories";
		return NextResponse.json(
			{ error: message },
			{ status: 500, headers: { "Cache-Control": "no-store" } }
		);
	}
}
