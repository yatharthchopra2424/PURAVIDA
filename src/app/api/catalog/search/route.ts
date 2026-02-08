import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const results = await searchProducts(query, 24);
  return NextResponse.json(results);
}
