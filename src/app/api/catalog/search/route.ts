import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
	const limitParam = request.nextUrl.searchParams.get("limit");
	const limit = Math.min(Math.max(Number(limitParam ?? 60) || 60, 1), 200);

	if (!q) {
		return NextResponse.json([], {
			headers: { "Cache-Control": "no-store" },
		});
	}

	// Cap query length — the RPC is parameterised, but there is no
	// reason to accept an unbounded string from a public endpoint.
	if (q.length > 100) {
		return NextResponse.json(
			{ message: "Search query too long" },
			{ status: 400, headers: { "Cache-Control": "no-store" } }
		);
	}

	try {
		const products = await searchProducts(q, limit);

		return NextResponse.json(products, {
			headers: {
				// Was `no-store`, so every keystroke hit the database even
				// for repeated queries. Popular terms are now served from
				// the CDN edge cache.
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (error) {
		console.error("[catalog/search] failed", error);
		return NextResponse.json(
			{ message: "Search failed" },
			{ status: 500, headers: { "Cache-Control": "no-store" } }
		);
	}
}
