import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeInternalRequest } from "@/server/internal/auth";

export async function POST(request: Request) {
  const unauthorized = authorizeInternalRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body!.ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const items = await db.depositRequest.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      userId: item.userId,
      email: item.user.email,
      requestedAmount: item.requestedAmount,
      requestedCredits: item.requestedCredits,
      depositorName: item.depositorName,
      bankName: item.bankName,
      accountNumberSnapshot: item.accountNumberSnapshot,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
}
