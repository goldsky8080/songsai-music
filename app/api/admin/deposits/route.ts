import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessAdminPage } from "@/server/auth/guards";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdminPage(sessionUser.role)) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10),
  );

  const [items, total] = await Promise.all([
    db.depositRequest.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    db.depositRequest.count(),
  ]);

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
      autoMatchedAt: item.autoMatchedAt,
      matchedNotificationId: item.matchedNotificationId,
      approvedBy: item.approvedBy,
      approvedAt: item.approvedAt,
      rejectedAt: item.rejectedAt,
      memo: item.memo,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
