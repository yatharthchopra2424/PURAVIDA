import { NextResponse } from "next/server";
import { fetchCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
	try {
		const categories = await fetchCategories();
		return NextResponse.json(categories, {
			headers: {
				"Cache-Control": "no-store, max-age=0",
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to load categories";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
