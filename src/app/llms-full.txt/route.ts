import { llmsFull } from "@/lib/llms";

export const dynamic = "force-static";

/** The site's content in one Markdown file for AI assistants. */
export function GET() {
  return new Response(llmsFull(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
