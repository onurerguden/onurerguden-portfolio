import { isLocale, locales } from "@/lib/content";
import { atomFeed } from "@/lib/feed";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** The articles in one language, as Atom. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  return new Response(atomFeed(locale), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
