import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
	const limitParam = request.nextUrl.searchParams.get("limit");
	const limit = Math.min(Math.max(Number(limitParam ?? 60) || 60, 1), 200);

	if (!q) {
		return NextResponse.json([], {
			headers: {
				"Cache-Control": "no-store",
			},
		});
	}

	try {
		const products = await searchProducts(q, limit);
		return NextResponse.json(products, {
			headers: {
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("Catalog search API error:", error);
		return NextResponse.json(
			{ message: "Search failed" },
			{ status: 500, headers: { "Cache-Control": "no-store" } }
		);
	}
}
