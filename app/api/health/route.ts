import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDatabase().execute(sql`select 1`);

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
