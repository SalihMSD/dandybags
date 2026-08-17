import { type TokenType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashToken, newId, randomToken } from "@/lib/db/store";

export async function issueAuthToken(userId: string, type: TokenType, hours: number) {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.authToken.deleteMany({
      where: { userId, type, usedAt: null },
    }),
    prisma.authToken.create({
      data: {
        id: newId("tok"),
        userId,
        type,
        tokenHash,
        expiresAt,
        usedAt: null,
      },
    }),
  ]);

  return token;
}

export async function findAuthToken(tokenHash: string, type: TokenType) {
  return prisma.authToken.findFirst({
    where: { tokenHash, type },
  });
}

export async function consumeVerifyToken(tokenId: string, userId: string) {
  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    }),
  ]);
}

export async function consumeResetToken(tokenId: string, userId: string, passwordHash: string) {
  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}
