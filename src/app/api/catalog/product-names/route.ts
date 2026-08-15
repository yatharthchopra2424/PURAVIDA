import { NextResponse } from "next/server";
import { fetchProductNames } from "@/lib/catalog";

/**
 * Lightweight product list for the contact form's product picker.
 *
 * The contact page previously called /api/catalog/products with no
 * `category` param. That route returns 400 without one, so the fetch
 * always failed, the catch swallowed it, and the dropdown was
 * permanently empty — on the primary lead-capture path.
 *
 * Returns a bare array (not { data }) to match what the client expects.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const products = await fetchProductNames(1000);

    return NextResponse.json(products, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[catalog/product-names] fetch failed", error);
    // Degrade to an empty list: the form stays usable with a free-text
    // product field rather than erroring outright.
    return NextResponse.json([], { status: 200 });
  }
}
