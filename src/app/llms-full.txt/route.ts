import { renderLlmsTxt } from "@/lib/llms";

// Regenerated hourly from the live catalogue, like the sitemap.
export const revalidate = 3600;

export async function GET() {
  return new Response(await renderLlmsTxt(true), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
