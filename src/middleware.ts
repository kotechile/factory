import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EDITORIAL_COOKIE_NAME = "pressflow_auth";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Check if request is targeting the editorial subdomain (e.g. editorial-factory.aichieve.net)
  const isEditorialHost = host.startsWith("editorial-") || host.startsWith("editorial.");

  if (isEditorialHost) {
    // If accessing root of editorial domain, serve the editorial workbench
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/pressflow", request.url));
    }
  }

  // Protect internal editorial API routes from unauthorized external callers
  if (pathname.startsWith("/api/articles") || pathname.startsWith("/api/linkedin")) {
    const authCookie = request.cookies.get(EDITORIAL_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("x-editorial-secret");
    const expectedSecret = process.env.EDITORIAL_SECRET || "factory_editorial_2026";

    // Allow internal service-role or valid session cookie
    const isAuthed =
      (authCookie && authCookie === expectedSecret) ||
      (authHeader && authHeader === expectedSecret);

    // If running in development or valid auth, allow through
    if (!isAuthed && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Protected editorial endpoint." },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
