import { sharedFacts } from "@/lib/content";
import { securityTxt } from "@/lib/security";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

/** Where to report a security problem (RFC 9116). */
export function GET() {
  return new Response(securityTxt(sharedFacts.email, siteOrigin()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
