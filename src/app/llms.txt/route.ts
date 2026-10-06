import { llmsIndex } from "@/lib/llms";

export const dynamic = "force-static";

/** The site's map for AI assistants (llmstxt.org). */
export function GET() {
  return new Response(llmsIndex(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
