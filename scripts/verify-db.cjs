const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
});

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const enums = await prisma.$queryRaw`
    SELECT t.typname AS enum_name
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `;
  const fks = await prisma.$queryRaw`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `;
  const uniques = await prisma.$queryRaw`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
  const productCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
    ORDER BY ordinal_position
  `;
  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
  };

  const tableNames = tables.map((r) => r.table_name);
  const enumNames = enums.map((r) => r.enum_name);
  const colNames = productCols.map((r) => r.column_name);
  const hasB2b = colNames.some((c) => c === "b2bPrice" || c === "b2bAvailable");

  console.log("TABLES:" + tableNames.join(","));
  console.log("ENUMS:" + enumNames.join(","));
  console.log("FK_COUNT:" + fks.length);
  console.log("INDEX_COUNT:" + uniques.length);
  console.log("PRODUCT_B2B_COLUMNS:" + hasB2b);
  console.log("ROW_COUNTS:users=" + counts.users + ",products=" + counts.products + ",orders=" + counts.orders);
  console.log("CLIENT_OK:true");
}

main()
  .catch((err) => {
    console.error("VERIFY_FAILED");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
