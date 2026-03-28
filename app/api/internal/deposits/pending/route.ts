import { DepositRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeInternalRequest } from "@/server/internal/auth";

export async function GET(request: Request) {
  const unauthorized = authorizeInternalRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const items = await db.depositRequest.findMany({
    where: {
      status: DepositRequestStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
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
