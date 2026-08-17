import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";

export type PublicCartItem = {
  sku: string;
  slug: string;
  name: string;
  qty: number;
  image: string;
};

const MAX_QTY = 99;

export function parseQty(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const qty = Math.floor(n);
  if (qty < 1) return null;
  return Math.min(qty, MAX_QTY);
}

export function parseCartItems(input: unknown): { sku: string; qty: number }[] {
  if (!Array.isArray(input)) return [];
  const qtyBySku = new Map<string, number>();
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const sku = String(rec.sku || "").trim();
    const qty = parseQty(rec.qty);
    if (!sku || qty == null) continue;
    qtyBySku.set(sku, Math.min(MAX_QTY, (qtyBySku.get(sku) || 0) + qty));
  }
  return [...qtyBySku.entries()].map(([sku, qty]) => ({ sku, qty }));
}

function toPublic(items: { sku: string; qty: number; product: { slug: string; name: string; imageFront: string } }[]): PublicCartItem[] {
  return items.map((item) => ({
    sku: item.sku,
    slug: item.product.slug,
    name: item.product.name,
    qty: item.qty,
    image: item.product.imageFront,
  }));
}

async function loadPublicCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
        orderBy: { sku: "asc" },
      },
    },
  });
  return { items: cart ? toPublic(cart.items) : [] };
}

export async function getCustomerCart(userId: string) {
  return loadPublicCart(userId);
}

async function ensureCart(tx: Prisma.TransactionClient, userId: string) {
  const existing = await tx.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.cart.create({
    data: { id: newId("crt"), userId },
  });
}

export async function replaceCustomerCart(userId: string, input: unknown) {
  const requested = parseCartItems(input);
  return prisma.$transaction(async (tx) => {
    const cart = await ensureCart(tx, userId);
    const products = requested.length
      ? await tx.product.findMany({
          where: {
            sku: { in: requested.map((i) => i.sku) },
            b2cAvailable: true,
          },
        })
      : [];
    const allowed = new Set(products.map((p) => p.sku));
    const items = requested.filter((i) => allowed.has(i.sku));

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (items.length) {
      await tx.cartItem.createMany({
        data: items.map((item) => ({
          id: newId("cit"),
          cartId: cart.id,
          sku: item.sku,
          qty: item.qty,
        })),
      });
    }

    const fresh = await tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: true }, orderBy: { sku: "asc" } },
      },
    });
    return { items: fresh ? toPublic(fresh.items) : [] };
  });
}

export async function mergeGuestCart(userId: string, input: unknown) {
  const guest = parseCartItems(input);
  if (!guest.length) return loadPublicCart(userId);

  return prisma.$transaction(async (tx) => {
    const cart = await ensureCart(tx, userId);
    const products = await tx.product.findMany({
      where: {
        sku: { in: guest.map((i) => i.sku) },
        b2cAvailable: true,
      },
    });
    const allowed = new Set(products.map((p) => p.sku));
    const validGuest = guest.filter((i) => allowed.has(i.sku));
    if (!validGuest.length) {
      const fresh = await tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: { include: { product: true }, orderBy: { sku: "asc" } },
        },
      });
      return { items: fresh ? toPublic(fresh.items) : [] };
    }

    const existing = await tx.cartItem.findMany({ where: { cartId: cart.id } });
    const qtyBySku = new Map(existing.map((row) => [row.sku, row.qty]));
    for (const item of validGuest) {
      qtyBySku.set(item.sku, Math.min(MAX_QTY, (qtyBySku.get(item.sku) || 0) + item.qty));
    }

    for (const [sku, qty] of qtyBySku) {
      await tx.cartItem.upsert({
        where: { cartId_sku: { cartId: cart.id, sku } },
        create: { id: newId("cit"), cartId: cart.id, sku, qty },
        update: { qty },
      });
    }

    const fresh = await tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: true }, orderBy: { sku: "asc" } },
      },
    });
    return { items: fresh ? toPublic(fresh.items) : [] };
  });
}
