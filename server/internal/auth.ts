import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export function authorizeInternalRequest(request: Request) {
  if (!env.SONGSAI_INTERNAL_SECRET) {
    return NextResponse.json(
      { error: "Internal API secret is not configured." },
      { status: 503 },
    );
  }

  const providedSecret = request.headers.get("x-internal-secret");

  if (!providedSecret || providedSecret !== env.SONGSAI_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
