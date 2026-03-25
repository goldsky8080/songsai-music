import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const mode = env.MUSIC_PROVIDER_MODE;
  const isConfigured = Boolean(env.SONGS_API_BASE_URL);

  if (mode !== "songs") {
    return NextResponse.json({
      mode,
      ok: true,
      configured: isConfigured,
      message: "Mock provider mode is active.",
    });
  }

  if (!env.SONGS_API_BASE_URL) {
    return NextResponse.json(
      {
        mode,
        ok: false,
        configured: false,
        message: "SONGS_API_BASE_URL is missing.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${env.SONGS_API_BASE_URL}/api/get_limit`, {
      headers: env.SONGS_COOKIE
        ? {
            Cookie: env.SONGS_COOKIE,
          }
        : undefined,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          mode,
          ok: false,
          configured: true,
          message: "SONGS API wrapper responded with an error.",
          status: response.status,
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as unknown;

    return NextResponse.json({
      mode,
      ok: true,
      configured: true,
      quota: payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        mode,
        ok: false,
        configured: true,
        message:
          error instanceof Error ? error.message : "Failed to reach SONGS API wrapper.",
      },
      { status: 502 },
    );
  }
}
