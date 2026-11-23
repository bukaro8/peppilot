import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function proxy(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });

  if (!session) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", safeReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/protocols/:path*", "/cycles/:path*", "/dashboard/:path*", "/calendar/:path*", "/injections/:path*", "/journal/:path*", "/onboarding/:path*", "/more/:path*"],
};
