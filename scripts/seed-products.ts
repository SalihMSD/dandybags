/**
 * PHASE D2: seed the exact catalogue from src/lib/products.ts into PostgreSQL.
 * Storefront and APIs are not changed.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { products } from "../src/lib/products";

const EXPECTED_TOTAL = 35;
const EXPECTED_PER_CATEGORY = 5;
const EXPECTED_CATEGORIES = [
  "school-bags",
  "college-bags",
  "backpacks",
  "travel-bags",
  "sling-bags",
  "handbags",
  "ladies-purses",
] as const;

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function rowFromCatalogue(p: (typeof products)[number]) {
  return {
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    imageFront: p.images.front,
    imageBack: p.images.back ?? null,
    imageLeft: p.images.left ?? null,
    imageRight: p.images.right ?? null,
    imageTop: p.images.top ?? null,
    imageBottom: p.images.bottom ?? null,
    imageInside: p.images.inside ?? null,
    imageZipper: p.images.zipper ?? null,
    imageStrap: p.images.strap ?? null,
    imageLifestyle: p.images.lifestyle ?? null,
    colour: p.colour,
    material: p.material,
    weight: p.weight,
    length: p.length,
    width: p.width,
    height: p.height,
    capacity: p.capacity,
    compartments: p.compartments,
    features: p.features,
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    stock: p.stock,
    b2cAvailable: p.b2cAvailable,
    featured: p.featured,
    description: p.description,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  };
}

async function main() {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const found = products.length;
  const byCategory = new Map<string, number>();
  for (const p of products) {
    byCategory.set(p.category, (byCategory.get(p.category) || 0) + 1);
  }
  const categories = [...byCategory.keys()].sort();
  const skus = products.map((p) => p.sku);
  const slugs = products.map((p) => p.slug);

  console.log("CATALOGUE_COUNT:" + found);
  console.log("CATEGORY_COUNT:" + categories.length);
  console.log("PER_CATEGORY:" + JSON.stringify(Object.fromEntries(byCategory)));

  if (found !== EXPECTED_TOTAL) {
    console.error(`STOP: products.ts has ${found} products, expected ${EXPECTED_TOTAL}. No seed ran.`);
    process.exit(1);
  }
  if (categories.length !== EXPECTED_CATEGORIES.length) {
    console.error(`STOP: products.ts has ${categories.length} categories, expected ${EXPECTED_CATEGORIES.length}.`);
    process.exit(1);
  }
  for (const slug of EXPECTED_CATEGORIES) {
    if ((byCategory.get(slug) || 0) !== EXPECTED_PER_CATEGORY) {
      console.error(`STOP: category ${slug} has ${byCategory.get(slug) || 0} products, expected ${EXPECTED_PER_CATEGORY}.`);
      process.exit(1);
    }
  }
  if (new Set(skus).size !== skus.length) {
    console.error("STOP: duplicate SKUs in products.ts");
    process.exit(1);
  }
  if (new Set(slugs).size !== slugs.length) {
    console.error("STOP: duplicate slugs in products.ts");
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ["error"] });
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const conflicts: string[] = [];

  try {
    const existing = await prisma.product.findMany({ select: { sku: true, slug: true } });
    const catalogueSku = new Set(skus);
    const unexpected = existing.filter((row) => !catalogueSku.has(row.sku));
    if (unexpected.length) {
      console.log("UNEXPECTED_SKU_COUNT:" + unexpected.length);
    }

    for (const p of products) {
      const data = rowFromCatalogue(p);
      const bySku = await prisma.product.findUnique({ where: { sku: p.sku } });
      const bySlug = await prisma.product.findUnique({ where: { slug: p.slug } });
      if (bySlug && bySlug.sku !== p.sku) {
        conflicts.push(`slug already used by a different SKU (${p.slug})`);
        skipped += 1;
        continue;
      }
      if (!bySku) {
        await prisma.product.create({
          data: { id: `prd_${p.sku}`, ...data },
        });
        inserted += 1;
        continue;
      }
      await prisma.product.update({
        where: { sku: p.sku },
        data,
      });
      updated += 1;
    }

    const db = await prisma.product.findMany({
      select: { sku: true, slug: true, category: true },
    });
    const dbByCat = new Map<string, number>();
    for (const row of db) {
      dbByCat.set(row.category, (dbByCat.get(row.category) || 0) + 1);
    }
    const dbSkus = db.map((r) => r.sku);
    const dbSlugs = db.map((r) => r.slug);

    console.log("INSERTED:" + inserted);
    console.log("UPDATED:" + updated);
    console.log("SKIPPED:" + skipped);
    console.log("CONFLICTS:" + conflicts.length);
    if (conflicts.length) console.log("CONFLICT_TYPES:" + conflicts.join(" | "));
    console.log("DB_TOTAL:" + db.length);
    console.log("DB_PER_CATEGORY:" + JSON.stringify(Object.fromEntries(dbByCat)));
    console.log("SKU_UNIQUE:" + (new Set(dbSkus).size === dbSkus.length));
    console.log("SLUG_UNIQUE:" + (new Set(dbSlugs).size === dbSlugs.length));
    console.log("B2B_FIELDS_IN_SEED:false");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("SEED_FAILED");
  const msg = err instanceof Error ? err.message : "unknown";
  console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
  process.exit(1);
});
