import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, labBlocked, labPath } from "@/lib/security";

/**
 * Every page gets its language, a fresh nonce and the Content Security Policy
 * built from it (Next applies the nonce to its own scripts). Lab pages are
 * never indexed and do not exist where the site is public.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    labBlocked(path, {
      VERCEL_ENV: process.env.VERCEL_ENV,
      SITE_INDEXABLE: process.env.SITE_INDEXABLE,
    })
  )
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  const locale = path.split("/")[1] === "tr" ? "tr" : "en";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    secure: request.nextUrl.protocol === "https:",
  });
  const headers = new Headers(request.headers);
  headers.set("x-portfolio-locale", locale);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  if (labPath.test(path))
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
// Every page request runs the proxy, prefetches included: skipping them would
// serve lab pages and HTML without a policy to anyone who sends the header.
// Only the API, build output and public files with a known extension skip it,
// so a page path that merely contains a dot is still covered.
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static/|_next/image(?:/|$)|.*\\.(?:avif|webp|png|jpe?g|gif|svg|ico|woff2?|txt|xml|json|webmanifest|glb|wasm|js|css|map)$).*)",
  ],
};
