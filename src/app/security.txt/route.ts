import { sharedFacts } from "@/lib/content";
import { securityTxt } from "@/lib/security";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Where to report a security problem (RFC 9116). Served at
 * /.well-known/security.txt through a rewrite in next.config.ts: Vercel
 * answered 404 for the route while it lived in a dot-named folder.
 */
export function GET() {
  return new Response(securityTxt(sharedFacts.email, siteOrigin()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
