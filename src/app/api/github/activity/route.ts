import { getActivity } from "@/lib/github/activity";

export const runtime = "nodejs";

/** Public activity for the live section; ETags make unchanged polls free. */
export async function GET(request: Request) {
  const result = await getActivity();
  if (result.status !== "live")
    return Response.json(
      { available: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const etag = `"activity-${result.revision}"`;
  const headers = {
    ETag: etag,
    "Cache-Control":
      "public, max-age=0, s-maxage=60, stale-while-revalidate=240",
  };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return Response.json(result.activity, { headers });
}
