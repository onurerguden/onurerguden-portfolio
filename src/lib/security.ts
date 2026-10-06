/**
 * The page's Content Security Policy, built per request with a fresh nonce.
 * Scripts run only with the nonce (and whatever those scripts load, through
 * 'strict-dynamic'); the desk's Draco decoder needs 'wasm-unsafe-eval' and a
 * blob worker. Styles allow inline attributes, which React's style props and
 * next/image write. Development adds 'unsafe-eval' for React's debugging.
 * Only a page served over HTTPS asks for its requests to be upgraded: over
 * plain http (a local production build, the CI browsers) WebKit would turn
 * every script and stylesheet into an https request that cannot connect.
 */
export function contentSecurityPolicy(
  nonce: string,
  { development = false, secure = true } = {},
) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${
      development ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // The model's embedded textures are read from blob: and data: URLs.
    "connect-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(secure && !development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * The lab pages (desk review, journey and room-poster captures) are for QA:
 * never indexed, and gone wherever the site is public.
 */
export const labPath = /^\/(en|tr)\/lab(\/|$)/;
export function labBlocked(
  path: string,
  env: { VERCEL_ENV?: string; SITE_INDEXABLE?: string },
) {
  return (
    labPath.test(path) &&
    (env.VERCEL_ENV === "production" || env.SITE_INDEXABLE === "true")
  );
}

/**
 * Where to report a security problem (RFC 9116). The required expiry is a
 * year after `now`; the file is built with each deploy, so it stays ahead
 * while the site is maintained.
 */
export function securityTxt(email: string, origin: string, now = new Date()) {
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return [
    `Contact: mailto:${email}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en, tr",
    `Canonical: ${origin}/.well-known/security.txt`,
    "",
  ].join("\n");
}
