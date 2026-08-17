import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";

export async function createDbSession(userId: string, expiresAt: Date) {
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
  const id = newId("ses");
  await prisma.session.create({
    data: {
      id,
      userId,
      expiresAt,
      createdAt: new Date(),
    },
  });
  return id;
}

export async function findValidSession(id: string, userId: string) {
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session || session.userId !== userId) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export async function deleteSessionById(id: string) {
  await prisma.session.deleteMany({ where: { id } });
}

export async function deleteSessionsForUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}
