import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const mode = env.MUSIC_PROVIDER_MODE;
  const isConfigured = Boolean(env.SUNO_API_BASE_URL);

  if (mode !== "suno") {
    return NextResponse.json({
      mode,
      ok: true,
      configured: isConfigured,
      message: "Mock provider mode is active.",
    });
  }

  if (!env.SUNO_API_BASE_URL) {
    return NextResponse.json(
      {
        mode,
        ok: false,
        configured: false,
        message: "SUNO_API_BASE_URL is missing.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${env.SUNO_API_BASE_URL}/api/get_limit`, {
      headers: env.SUNO_COOKIE
        ? {
            Cookie: env.SUNO_COOKIE,
          }
        : undefined,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          mode,
          ok: false,
          configured: true,
          message: "Suno wrapper responded with an error.",
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
          error instanceof Error ? error.message : "Failed to reach Suno wrapper.",
      },
      { status: 502 },
    );
  }
}
