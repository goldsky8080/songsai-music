import { PrismaClient, DepositRequestStatus } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: "deposit-test@songsai.local" },
    update: {},
    create: {
      email: "deposit-test@songsai.local",
      passwordHash: "test-password-hash",
      freeCredits: 0,
      paidCredits: 0,
      role: "USER",
    },
  });

  const created = await db.depositRequest.create({
    data: {
      userId: user.id,
      requestedAmount: 6100,
      requestedCredits: 6100,
      depositorName: "홍길동",
      bankName: "테스트은행",
      accountNumberSnapshot: "111-222-333333",
      status: DepositRequestStatus.PENDING,
    },
  });

  console.log(
    JSON.stringify(
      {
        userId: user.id,
        depositRequestId: created.id,
        requestedAmount: created.requestedAmount,
        depositorName: created.depositorName,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
