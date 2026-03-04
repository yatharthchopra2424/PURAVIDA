import { NextResponse } from "next/server";
import { fetchProductsByCategory } from "@/lib/catalog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";

  if (!category) {
    return NextResponse.json({ error: "category param required" }, { status: 400 });
  }

  const products = await fetchProductsByCategory(category);
  return NextResponse.json({ data: products });
}
