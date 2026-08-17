import { PrismaClient } from "@prisma/client";

/**
 * Server-only Prisma client. Do not import from client components or middleware.
 * Next.js hot reload reuses the same instance in development via globalThis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
