import { DepositRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeInternalRequest } from "@/server/internal/auth";

const markAutoMatchedSchema = z.object({
  matchedNotificationId: z.string().trim().min(1),
  memo: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = authorizeInternalRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const parsed = markAutoMatchedSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const item = await db.depositRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      autoMatchedAt: true,
      matchedNotificationId: true,
      memo: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Deposit request not found." }, { status: 404 });
  }

  if (
    item.status === DepositRequestStatus.APPROVED ||
    item.status === DepositRequestStatus.REJECTED ||
    item.status === DepositRequestStatus.CANCELLED
  ) {
    return NextResponse.json(
      { error: "Deposit request can no longer be auto-matched." },
      { status: 409 },
    );
  }

  const updated = await db.depositRequest.update({
    where: { id },
    data: {
      status: DepositRequestStatus.AUTO_MATCHED,
      autoMatchedAt: item.autoMatchedAt ?? new Date(),
      matchedNotificationId: parsed.data.matchedNotificationId,
      memo: parsed.data.memo ?? item.memo,
    },
  });

  return NextResponse.json({
    item: {
      id: updated.id,
      status: updated.status,
      autoMatchedAt: updated.autoMatchedAt,
      matchedNotificationId: updated.matchedNotificationId,
      memo: updated.memo,
      updatedAt: updated.updatedAt,
    },
  });
}
