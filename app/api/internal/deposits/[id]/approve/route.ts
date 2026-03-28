import { CreditKind, DepositRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeInternalRequest } from "@/server/internal/auth";
import { grantCredits } from "@/server/credits/service";

const approveDepositSchema = z.object({
  memo: z.string().trim().max(300).optional(),
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
  const parsed = approveDepositSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const deposit = await tx.depositRequest.findUnique({
        where: { id },
      });

      if (!deposit) {
        throw new Error("Deposit request not found.");
      }

      if (deposit.status === DepositRequestStatus.APPROVED) {
        throw new Error("Deposit request is already approved.");
      }

      if (deposit.status === DepositRequestStatus.REJECTED) {
        throw new Error("Deposit request is already rejected.");
      }

      await grantCredits(
        deposit.userId,
        deposit.requestedCredits,
        CreditKind.PAID,
        `deposit-request:${deposit.id}`,
        `bank transfer approved:${deposit.id}`,
        tx,
      );

      return tx.depositRequest.update({
        where: { id: deposit.id },
        data: {
          status: DepositRequestStatus.APPROVED,
          approvedBy: parsed.data.approvedBy ?? "bank-bridge",
          approvedAt: new Date(),
          memo: parsed.data.memo ?? deposit.memo,
        },
      });
    });

    return NextResponse.json({
      item: updated,
      message: "Deposit request approved and paid credits granted.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve deposit request.",
      },
      { status: 400 },
    );
  }
}
