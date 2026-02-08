import { NextResponse } from "next/server";
import { fetchProductNames } from "@/lib/catalog";

export async function GET() {
  try {
    const products = await fetchProductNames();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load products" },
      { status: 500 }
    );
  }
}
