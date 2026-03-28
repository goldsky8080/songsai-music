import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

function readEnvValue(name) {
  const envPath = resolve(process.cwd(), ".env");
  const content = readFileSync(envPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));

  if (!line) {
    throw new Error(`${name} is missing in .env`);
  }

  return line.slice(name.length + 1).replace(/^"|"$/g, "");
}

async function createSessionToken(user, authSecret) {
  const secret = new TextEncoder().encode(authSecret);

  return new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

async function main() {
  const depositRequestId = process.argv[2];

  if (!depositRequestId) {
    throw new Error("Usage: node scripts/approve-test-deposit.mjs <depositRequestId>");
  }

  const authSecret = readEnvValue("AUTH_SECRET");
  const db = new PrismaClient();

  try {
    const admin = await db.user.upsert({
      where: { email: "admin-test@songsai.local" },
      update: { role: "ADMIN" },
      create: {
        email: "admin-test@songsai.local",
        passwordHash: "test-password-hash",
        freeCredits: 0,
        paidCredits: 0,
        role: "ADMIN",
      },
    });

    const token = await createSessionToken(admin, authSecret);
    const response = await fetch(
      `http://localhost:3000/api/admin/deposits/${depositRequestId}/approve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `music-platform-session=${token}`,
        },
        body: JSON.stringify({
          memo: "Test approval via scripted admin session",
        }),
      },
    );

    const text = await response.text();
    console.log(text);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
