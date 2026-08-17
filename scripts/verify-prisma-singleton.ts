/**
 * E2 check: import the app Prisma singleton and query Neon.
 * Does not print DATABASE_URL or secrets.
 */
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const users = await prisma.user.count();
  const products = await prisma.product.count();
  const orders = await prisma.order.count();
  console.log("SINGLETON_OK:true");
  console.log("COUNTS:users=" + users + ",products=" + products + ",orders=" + orders);
}

main()
  .catch((err: unknown) => {
    console.error("SINGLETON_VERIFY_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
