import { CreditGrantStatus, CreditKind, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  FREE_CREDIT_DAYS,
  FREE_SIGNUP_CREDITS,
  PAID_CREDIT_DAYS,
} from "@/server/credits/constants";
import {
  ADDITIONAL_TRACK_UNLOCK_COST,
  getMusicGenerationCost,
} from "@/server/music/constants";

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function syncUserCreditBalances(userId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? db;
  const now = new Date();

  await client.creditGrant.updateMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      expiresAt: {
        lte: now,
      },
      remainingAmount: {
        gt: 0,
      },
    },
    data: {
      remainingAmount: 0,
      status: CreditGrantStatus.EXPIRED,
      updatedAt: now,
    },
  });

  const grants = await client.creditGrant.findMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      remainingAmount: {
        gt: 0,
      },
      expiresAt: {
        gt: now,
      },
    },
    select: {
      creditKind: true,
      remainingAmount: true,
    },
  });

  const freeCredits = grants
    .filter((grant) => grant.creditKind === CreditKind.FREE)
    .reduce((sum, grant) => sum + grant.remainingAmount, 0);

  const paidCredits = grants
    .filter((grant) => grant.creditKind === CreditKind.PAID)
    .reduce((sum, grant) => sum + grant.remainingAmount, 0);

  await client.user.update({
    where: { id: userId },
    data: {
      freeCredits,
      paidCredits,
    },
  });

  return {
    freeCredits,
    paidCredits,
    totalCredits: freeCredits + paidCredits,
  };
}

export async function grantSignupCredits(userId: string, tx: Prisma.TransactionClient) {
  return grantCredits(userId, FREE_SIGNUP_CREDITS, CreditKind.FREE, "signup_bonus", "signup bonus credits", tx);
}

export function getCreditExpiryDays(creditKind: CreditKind) {
  return creditKind === CreditKind.FREE ? FREE_CREDIT_DAYS : PAID_CREDIT_DAYS;
}

export async function grantCredits(
  userId: string,
  amount: number,
  creditKind: CreditKind,
  source: string,
  memo: string,
  tx: Prisma.TransactionClient,
) {
  const now = new Date();
  const expiresAt = addDays(now, getCreditExpiryDays(creditKind));
  const currentUser = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      freeCredits: true,
      paidCredits: true,
    },
  });

  const nextFreeCredits =
    creditKind === CreditKind.FREE ? currentUser.freeCredits + amount : currentUser.freeCredits;
  const nextPaidCredits =
    creditKind === CreditKind.PAID ? currentUser.paidCredits + amount : currentUser.paidCredits;

  await tx.creditGrant.create({
    data: {
      userId,
      creditKind,
      amount,
      remainingAmount: amount,
      expiresAt,
      source,
    },
  });

  await tx.transaction.create({
    data: {
      userId,
      amount,
      creditKind,
      type: "DEPOSIT",
      status: "COMPLETED",
      balanceAfter: creditKind === CreditKind.FREE ? nextFreeCredits : nextPaidCredits,
      memo,
    },
  });

  await tx.user.update({
    where: { id: userId },
    data: {
      freeCredits: nextFreeCredits,
      paidCredits: nextPaidCredits,
    },
  });

  return {
    expiresAt,
    nextFreeCredits,
    nextPaidCredits,
  };
}

export async function setUserCreditBalances(
  userId: string,
  nextFreeCredits: number,
  nextPaidCredits: number,
  source: string,
  memo: string,
  tx: Prisma.TransactionClient,
) {
  const currentBalances = await syncUserCreditBalances(userId, tx);
  const now = new Date();

  await tx.creditGrant.updateMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      remainingAmount: {
        gt: 0,
      },
    },
    data: {
      remainingAmount: 0,
      status: CreditGrantStatus.CONSUMED,
      updatedAt: now,
    },
  });

  if (nextFreeCredits > 0) {
    await tx.creditGrant.create({
      data: {
        userId,
        creditKind: CreditKind.FREE,
        amount: nextFreeCredits,
        remainingAmount: nextFreeCredits,
        expiresAt: addDays(now, getCreditExpiryDays(CreditKind.FREE)),
        source,
      },
    });
  }

  if (nextPaidCredits > 0) {
    await tx.creditGrant.create({
      data: {
        userId,
        creditKind: CreditKind.PAID,
        amount: nextPaidCredits,
        remainingAmount: nextPaidCredits,
        expiresAt: addDays(now, getCreditExpiryDays(CreditKind.PAID)),
        source,
      },
    });
  }

  if (currentBalances.freeCredits !== nextFreeCredits) {
    await tx.transaction.create({
      data: {
        userId,
        amount: nextFreeCredits - currentBalances.freeCredits,
        creditKind: CreditKind.FREE,
        type: "ADJUSTMENT",
        status: "COMPLETED",
        balanceAfter: nextFreeCredits,
        memo,
      },
    });
  }

  if (currentBalances.paidCredits !== nextPaidCredits) {
    await tx.transaction.create({
      data: {
        userId,
        amount: nextPaidCredits - currentBalances.paidCredits,
        creditKind: CreditKind.PAID,
        type: "ADJUSTMENT",
        status: "COMPLETED",
        balanceAfter: nextPaidCredits,
        memo,
      },
    });
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      freeCredits: nextFreeCredits,
      paidCredits: nextPaidCredits,
    },
  });

  return {
    freeCredits: nextFreeCredits,
    paidCredits: nextPaidCredits,
    totalCredits: nextFreeCredits + nextPaidCredits,
  };
}

async function consumeCredits(
  userId: string,
  amount: number,
  memo: string,
  tx: Prisma.TransactionClient,
) {
  const balances = await syncUserCreditBalances(userId, tx);

  if (balances.totalCredits < amount) {
    throw new Error("크레딧이 부족합니다.");
  }

  let remainingCost = amount;

  const grants = await tx.creditGrant.findMany({
    where: {
      userId,
      status: CreditGrantStatus.ACTIVE,
      remainingAmount: {
        gt: 0,
      },
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: [
      { creditKind: "asc" },
      { expiresAt: "asc" },
      { createdAt: "asc" },
    ],
  });

  let freeSpent = 0;
  let paidSpent = 0;

  for (const grant of grants) {
    if (remainingCost <= 0) {
      break;
    }

    const deductAmount = Math.min(grant.remainingAmount, remainingCost);
    const nextRemaining = grant.remainingAmount - deductAmount;

    await tx.creditGrant.update({
      where: { id: grant.id },
      data: {
        remainingAmount: nextRemaining,
        lastUsedAt: new Date(),
        status: nextRemaining === 0 ? CreditGrantStatus.CONSUMED : CreditGrantStatus.ACTIVE,
      },
    });

    if (grant.creditKind === CreditKind.FREE) {
      freeSpent += deductAmount;
    } else {
      paidSpent += deductAmount;
    }

    remainingCost -= deductAmount;
  }

  const nextFreeCredits = balances.freeCredits - freeSpent;
  const nextPaidCredits = balances.paidCredits - paidSpent;

  if (freeSpent > 0) {
    await tx.transaction.create({
      data: {
        userId,
        amount: -freeSpent,
        creditKind: CreditKind.FREE,
        type: "USAGE",
        status: "COMPLETED",
        balanceAfter: nextFreeCredits,
        memo,
      },
    });
  }

  if (paidSpent > 0) {
    await tx.transaction.create({
      data: {
        userId,
        amount: -paidSpent,
        creditKind: CreditKind.PAID,
        type: "USAGE",
        status: "COMPLETED",
        balanceAfter: nextPaidCredits,
        memo,
      },
    });
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      freeCredits: nextFreeCredits,
      paidCredits: nextPaidCredits,
    },
  });

  return {
    chargedAmount: amount,
    freeSpent,
    paidSpent,
  };
}

export async function consumeMusicGenerationCredits(
  userId: string,
  musicId: string,
  trackCount: 1 | 2,
  tx: Prisma.TransactionClient,
) {
  const generationCost = getMusicGenerationCost(trackCount);
  return consumeCredits(userId, generationCost, `music_generation:${musicId}`, tx);
}

export async function consumeAdditionalTrackUnlockCredits(
  userId: string,
  musicGroupId: string,
  tx: Prisma.TransactionClient,
) {
  return consumeCredits(
    userId,
    ADDITIONAL_TRACK_UNLOCK_COST,
    `music_bonus_unlock:${musicGroupId}`,
    tx,
  );
}

export async function consumeVideoRenderCredits(
  userId: string,
  videoId: string,
  amount: number,
  tx: Prisma.TransactionClient,
) {
  return consumeCredits(userId, amount, `video_render:${videoId}`, tx);
}

async function refundUsageCreditsByMemo(userId: string, usageMemo: string, refundMemoPrefix: string) {
  const usageTransactions = await db.transaction.findMany({
    where: {
      userId,
      type: "USAGE",
      status: "COMPLETED",
      memo: usageMemo,
    },
  });

  if (usageTransactions.length === 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    await syncUserCreditBalances(userId, tx);

    const currentUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        freeCredits: true,
        paidCredits: true,
      },
    });

    let freeCredits = currentUser.freeCredits;
    let paidCredits = currentUser.paidCredits;

    for (const entry of usageTransactions) {
      const refundAmount = Math.abs(entry.amount);
      const creditKind = entry.creditKind ?? CreditKind.PAID;

      await tx.creditGrant.create({
        data: {
          userId,
          creditKind,
          amount: refundAmount,
          remainingAmount: refundAmount,
          expiresAt: addDays(new Date(), getCreditExpiryDays(creditKind)),
          source: `refund:${usageMemo}`,
        },
      });

      if (creditKind === CreditKind.FREE) {
        freeCredits += refundAmount;
      } else {
        paidCredits += refundAmount;
      }

      await tx.transaction.create({
        data: {
          userId,
          amount: refundAmount,
          creditKind,
          type: "REFUND",
          status: "COMPLETED",
          balanceAfter: creditKind === CreditKind.FREE ? freeCredits : paidCredits,
          memo: `${refundMemoPrefix}:${entry.id}`,
        },
      });

      await tx.transaction.update({
        where: { id: entry.id },
        data: {
          status: "CANCELLED",
          memo: `${usageMemo}:refunded`,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        freeCredits,
        paidCredits,
      },
    });
  });
}

export async function refundMusicGenerationCredits(userId: string, musicId: string) {
  await refundUsageCreditsByMemo(
    userId,
    `music_generation:${musicId}`,
    `music_generation_refund:${musicId}`,
  );
}

export async function refundVideoRenderCredits(userId: string, videoId: string) {
  await refundUsageCreditsByMemo(
    userId,
    `video_render:${videoId}`,
    `video_render_refund:${videoId}`,
  );
}
