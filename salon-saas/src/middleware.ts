import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const session = await auth();
  const path = req.nextUrl.pathname;

  const isApiRoute = path.startsWith("/api/");
  const isSuperAdminRoute = path.startsWith("/superadmin") || path.startsWith("/api/superadmin");
  const isTenantRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/setup") ||
    path.startsWith("/appointments") ||
    path.startsWith("/staff") ||
    path.startsWith("/customers") ||
    path.startsWith("/billing") ||
    path.startsWith("/inventory") ||
    path.startsWith("/reports") ||
    path.startsWith("/settings") ||
    path.startsWith("/marketing") ||
    path.startsWith("/gift-cards") ||
    path.startsWith("/packages") ||
    path.startsWith("/check-in") ||
    path.startsWith("/shift-handovers") ||
    path.startsWith("/cash-drawer") ||
    path.startsWith("/waitlist") ||
    path.startsWith("/api/tenant");

  // Super admin routes
  if (isSuperAdminRoute) {
    if (!session) {
      if (isApiRoute) return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
      return NextResponse.redirect(new URL("/login?type=superadmin", req.url));
    }
    if (session.user.role !== "SUPER_ADMIN") {
      if (isApiRoute) return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Tenant routes
  if (isTenantRoute) {
    if (!session) {
      if (isApiRoute) return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!session.user.tenantId) {
      if (isApiRoute) return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  const response = NextResponse.next();

  // Inject tenant context headers
  if (session?.user) {
    if (session.user.tenantId) response.headers.set("x-tenant-id", session.user.tenantId);
    response.headers.set("x-user-id", session.user.id ?? "");
    response.headers.set("x-user-role", session.user.role ?? "");
  }

  return response;
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/dashboard/:path*",
    "/setup/:path*",
    "/appointments/:path*",
    "/staff/:path*",
    "/customers/:path*",
    "/billing/:path*",
    "/inventory/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/marketing/:path*",
    "/gift-cards/:path*",
    "/packages/:path*",
    "/check-in/:path*",
    "/shift-handovers/:path*",
    "/cash-drawer/:path*",
    "/waitlist/:path*",
    "/api/superadmin/:path*",
    "/api/tenant/:path*",
  ],
};
