import { NextRequest, NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireAuthenticatedActor,
} from "@/lib/auth/authorization";
import { getPrivateProfile } from "@/lib/profile/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedActor(request.headers);
    const profile = await getPrivateProfile(actor.userId);

    if (!profile) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
