import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    return await toNextJsHandler(getAuth()).GET(request);
  } catch {
    return Response.redirect(new URL("/sign-in?error=authentication-failed", request.url), 302);
  }
}

export async function POST(request: Request) {
  try {
    return await toNextJsHandler(getAuth()).POST(request);
  } catch {
    return Response.json({ message: "Authentication could not be completed." }, { status: 500 });
  }
}
