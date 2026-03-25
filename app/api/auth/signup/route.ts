import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email/password signup has been disabled. Please continue with Google." },
    { status: 410 },
  );
}
