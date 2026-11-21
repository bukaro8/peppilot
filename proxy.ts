import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/protocols/:path*", "/cycles/:path*", "/dashboard/:path*", "/calendar/:path*", "/injections/:path*"],
};
