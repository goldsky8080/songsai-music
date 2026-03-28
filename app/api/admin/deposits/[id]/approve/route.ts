import { NextRequest, NextResponse } from "next/server";
import { CreditKind, DepositRequestStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isOperator } from "@/server/auth/guards";
import { grantCredits } from "@/server/credits/service";

const approveDepositSchema = z.object({
  memo: z.string().trim().max(300).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isOperator(sessionUser.role)) {
    return unauthorized();
  }

  const { id } = await context.params;
  const parsed = approveDepositSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const deposit = await tx.depositRequest.findUnique({
        where: { id },
      });

      if (!deposit) {
        throw new Error("입금 요청을 찾을 수 없습니다.");
      }

      if (deposit.status === DepositRequestStatus.APPROVED) {
        throw new Error("이미 승인된 입금 요청입니다.");
      }

      if (deposit.status === DepositRequestStatus.REJECTED) {
        throw new Error("이미 반려된 입금 요청입니다.");
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
          approvedBy: sessionUser.id,
          approvedAt: new Date(),
          memo: parsed.data.memo ?? deposit.memo,
        },
      });
    });

    return NextResponse.json({
      item: updated,
      message: "입금 요청을 승인하고 유료 크레딧을 지급했습니다.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "입금 요청 승인에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

