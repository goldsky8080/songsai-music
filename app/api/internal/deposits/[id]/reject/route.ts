import { DepositRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeInternalRequest } from "@/server/internal/auth";

const rejectDepositSchema = z.object({
  memo: z.string().trim().min(1).max(300),
  approvedBy: z.string().trim().min(1).max(100).optional(),
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
  const parsed = rejectDepositSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Reject memo is required." }, { status: 400 });
  }

  try {
    const updated = await db.depositRequest.update({
      where: { id },
      data: {
        status: DepositRequestStatus.REJECTED,
        rejectedAt: new Date(),
        approvedBy: parsed.data.approvedBy ?? "bank-bridge",
        memo: parsed.data.memo,
      },
    });

    return NextResponse.json({
      item: updated,
      message: "Deposit request rejected.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reject deposit request.",
      },
      { status: 400 },
    );
  }
}
