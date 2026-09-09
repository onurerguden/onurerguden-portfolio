import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const locale = request.nextUrl.pathname.split("/")[1] === "tr" ? "tr" : "en";
  const headers = new Headers(request.headers);
  headers.set("x-portfolio-locale", locale);
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
