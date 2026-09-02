import { NextResponse, type NextRequest } from "next/server";

// Host-based entry: app.presagemarkets.org serves the app (markets) at its root,
// docs.presagemarkets.org serves the technical docs, while the apex
// presagemarkets.org keeps the marketing landing at "/".
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;
  if (url.pathname === "/") {
    if (host.startsWith("app.")) {
      url.pathname = "/markets";
      return NextResponse.rewrite(url);
    }
    if (host.startsWith("docs.")) {
      url.pathname = "/docs";
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
