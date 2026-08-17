/**
 * PHASE D1: copy existing data/dandy.json rows into PostgreSQL.
 * Does not print passwords, hashes, or tokens.
 * Does not modify dandy.json or application APIs.
 */
const { createHash } = require("crypto");
const { existsSync, readFileSync } = require("fs");
const { resolve } = require("path");
const { PrismaClient } = require("@prisma/client");

const root = resolve(__dirname, "..");
const jsonPath = resolve(root, "data", "dandy.json");
const envPath = resolve(root, ".env.local");

function loadLocalEnv() {
  if (!existsSync(envPath)) {
    throw new Error("Missing .env.local");
  }
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

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function looksLikeBcrypt(hash) {
  return typeof hash === "string" && hash.startsWith("$2") && hash.length >= 50;
}

const stats = {
  read: {
    users: 0,
    addresses: 0,
    sessions: 0,
    tokens: 0,
    carts: 0,
    cartItems: 0,
    wishlist: 0,
    orders: 0,
    orderItems: 0,
    outbox: 0,
  },
  inserted: {
    users: 0,
    addresses: 0,
    sessions: 0,
    tokens: 0,
    carts: 0,
    cartItems: 0,
    wishlist: 0,
    orders: 0,
    orderItems: 0,
  },
  skipped: {
    users: 0,
    addresses: 0,
    sessions: 0,
    tokens: 0,
    carts: 0,
    cartItems: 0,
    wishlist: 0,
    orders: 0,
    orderItems: 0,
    outbox: 0,
  },
  conflicts: [],
  errors: [],
};

function skip(kind) {
  stats.skipped[kind] += 1;
}

async function main() {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env.local");
  }
  if (!existsSync(jsonPath)) {
    throw new Error("data/dandy.json not found");
  }

  const jsonHashBefore = fileHash(jsonPath);
  const raw = JSON.parse(readFileSync(jsonPath, "utf8"));

  const users = Array.isArray(raw.users) ? raw.users : [];
  const addresses = Array.isArray(raw.addresses) ? raw.addresses : [];
  const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  const tokens = Array.isArray(raw.tokens) ? raw.tokens : [];
  const carts = Array.isArray(raw.carts) ? raw.carts : [];
  const wishlist = Array.isArray(raw.wishlist) ? raw.wishlist : [];
  const orders = Array.isArray(raw.orders) ? raw.orders : [];
  const outbox = Array.isArray(raw.outbox) ? raw.outbox : [];

  stats.read.users = users.length;
  stats.read.addresses = addresses.length;
  stats.read.sessions = sessions.length;
  stats.read.tokens = tokens.length;
  stats.read.carts = carts.length;
  stats.read.cartItems = carts.reduce((n, c) => n + (Array.isArray(c.items) ? c.items.length : 0), 0);
  stats.read.wishlist = wishlist.length;
  stats.read.orders = orders.length;
  stats.read.orderItems = orders.reduce((n, o) => n + (Array.isArray(o.items) ? o.items.length : 0), 0);
  stats.read.outbox = outbox.length;
  stats.skipped.outbox = outbox.length;

  for (const user of users) {
    if (!looksLikeBcrypt(user.passwordHash)) {
      throw new Error(`User ${user.id} is missing a usable bcrypt hash. Aborting.`);
    }
  }

  const prisma = new PrismaClient({ log: ["error"] });

  try {
    const existing = {
      users: await prisma.user.count(),
      products: await prisma.product.count(),
      orders: await prisma.order.count(),
      addresses: await prisma.address.count(),
    };
    console.log(
      `Pre-check: users=${existing.users} products=${existing.products} orders=${existing.orders} addresses=${existing.addresses}`,
    );

    const productSkus = new Set((await prisma.product.findMany({ select: { sku: true } })).map((p) => p.sku));
    const cartSkus = [];
    for (const cart of carts) {
      for (const item of cart.items || []) {
        if (item?.sku) cartSkus.push(String(item.sku));
      }
    }
    const wishSkus = wishlist.map((w) => w?.sku).filter(Boolean).map(String);
    const missingSkus = [...new Set([...cartSkus, ...wishSkus])].filter((sku) => !productSkus.has(sku));
    if (missingSkus.length > 0) {
      console.error(
        `STOP: cart/wishlist SKUs are not in the Product table (${missingSkus.length} SKU(s)). Seed products in Phase D2 first. SKUs not printed.`,
      );
      process.exit(1);
    }

    await prisma.$transaction(async (tx) => {
      const userIds = new Set();

      for (const user of users) {
        const byId = await tx.user.findUnique({ where: { id: user.id } });
        if (byId) {
          skip("users");
          stats.conflicts.push(`user id already exists (${user.role || "role omitted"})`);
          userIds.add(byId.id);
          continue;
        }
        const byEmail = await tx.user.findUnique({ where: { email: user.email } });
        if (byEmail) {
          skip("users");
          stats.conflicts.push("user email already exists with a different id");
          continue;
        }
        const byPhone = await tx.user.findUnique({ where: { phone: user.phone } });
        if (byPhone) {
          skip("users");
          stats.conflicts.push("user phone already exists with a different id");
          continue;
        }
        await tx.user.create({
          data: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            passwordHash: user.passwordHash,
            role: user.role,
            status: user.status || "ACTIVE",
            emailVerified: Boolean(user.emailVerified),
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
        userIds.add(user.id);
        stats.inserted.users += 1;
      }

      const dbUserIds = new Set((await tx.user.findMany({ select: { id: true } })).map((u) => u.id));

      for (const address of addresses) {
        if (!dbUserIds.has(address.userId)) {
          stats.errors.push("address skipped: userId not found");
          skip("addresses");
          continue;
        }
        const exists = await tx.address.findUnique({ where: { id: address.id } });
        if (exists) {
          skip("addresses");
          stats.conflicts.push("address id already exists");
          continue;
        }
        await tx.address.create({
          data: {
            id: address.id,
            userId: address.userId,
            fullName: address.fullName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2 || "",
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            landmark: address.landmark || "",
            isDefault: Boolean(address.isDefault),
          },
        });
        stats.inserted.addresses += 1;
      }

      for (const session of sessions) {
        if (!dbUserIds.has(session.userId)) {
          stats.errors.push("session skipped: userId not found");
          skip("sessions");
          continue;
        }
        const exists = await tx.session.findUnique({ where: { id: session.id } });
        if (exists) {
          skip("sessions");
          stats.conflicts.push("session id already exists");
          continue;
        }
        await tx.session.create({
          data: {
            id: session.id,
            userId: session.userId,
            expiresAt: new Date(session.expiresAt),
            createdAt: new Date(session.createdAt),
          },
        });
        stats.inserted.sessions += 1;
      }

      for (const token of tokens) {
        if (!dbUserIds.has(token.userId)) {
          stats.errors.push("auth token skipped: userId not found");
          skip("tokens");
          continue;
        }
        if (!token.tokenHash || String(token.tokenHash).length < 32) {
          stats.errors.push("auth token skipped: missing hash");
          skip("tokens");
          continue;
        }
        const byId = await tx.authToken.findUnique({ where: { id: token.id } });
        if (byId) {
          skip("tokens");
          stats.conflicts.push("auth token id already exists");
          continue;
        }
        const byHash = await tx.authToken.findUnique({ where: { tokenHash: token.tokenHash } });
        if (byHash) {
          skip("tokens");
          stats.conflicts.push("auth token hash already exists");
          continue;
        }
        await tx.authToken.create({
          data: {
            id: token.id,
            userId: token.userId,
            type: token.type,
            tokenHash: token.tokenHash,
            expiresAt: new Date(token.expiresAt),
            usedAt: token.usedAt ? new Date(token.usedAt) : null,
          },
        });
        stats.inserted.tokens += 1;
      }

      for (const cart of carts) {
        if (!dbUserIds.has(cart.userId)) {
          stats.errors.push("cart skipped: userId not found");
          skip("carts");
          continue;
        }
        const existingCart = await tx.cart.findUnique({ where: { userId: cart.userId } });
        if (existingCart) {
          skip("carts");
          stats.conflicts.push("cart already exists for user");
          continue;
        }
        const cartId = cart.id || `cart_${cart.userId}`;
        await tx.cart.create({
          data: {
            id: cartId,
            userId: cart.userId,
            updatedAt: cart.updatedAt ? new Date(cart.updatedAt) : new Date(),
          },
        });
        stats.inserted.carts += 1;
        for (const item of cart.items || []) {
          await tx.cartItem.create({
            data: {
              id: item.id || `ci_${cartId}_${item.sku}`,
              cartId,
              sku: String(item.sku),
              qty: Number(item.qty) || 1,
            },
          });
          stats.inserted.cartItems += 1;
        }
      }

      for (const row of wishlist) {
        if (!dbUserIds.has(row.userId)) {
          stats.errors.push("wishlist skipped: userId not found");
          skip("wishlist");
          continue;
        }
        const exists = await tx.wishlist.findUnique({
          where: { userId_sku: { userId: row.userId, sku: row.sku } },
        });
        if (exists) {
          skip("wishlist");
          stats.conflicts.push("wishlist pair already exists");
          continue;
        }
        await tx.wishlist.create({
          data: {
            id: row.id || `wish_${row.userId}_${row.sku}`,
            userId: row.userId,
            sku: row.sku,
            addedAt: row.addedAt ? new Date(row.addedAt) : new Date(),
          },
        });
        stats.inserted.wishlist += 1;
      }

      for (const order of orders) {
        if (!dbUserIds.has(order.userId)) {
          stats.errors.push("order skipped: userId not found");
          skip("orders");
          continue;
        }
        const exists = await tx.order.findUnique({ where: { id: order.id } });
        if (exists) {
          skip("orders");
          stats.conflicts.push("order id already exists");
          continue;
        }
        const ship = order.shippingAddress || {};
        await tx.order.create({
          data: {
            id: order.id,
            userId: order.userId,
            totalLabel: order.totalLabel,
            paymentStatus: order.paymentStatus || "PENDING",
            orderStatus: order.orderStatus || "PLACED",
            shipFullName: ship.fullName || "",
            shipPhone: ship.phone || "",
            shipLine1: ship.line1 || "",
            shipLine2: ship.line2 || "",
            shipCity: ship.city || "",
            shipState: ship.state || "",
            shipPincode: ship.pincode || "",
            shipLandmark: ship.landmark || "",
            createdAt: new Date(order.createdAt),
            items: {
              create: (order.items || []).map((item, i) => ({
                id: item.id || `${order.id}_item_${i}`,
                sku: String(item.sku || ""),
                slug: String(item.slug || ""),
                name: String(item.name || ""),
                qty: Number(item.qty) || 1,
                image: String(item.image || ""),
                unitPrice: item.unitPrice == null ? null : item.unitPrice,
              })),
            },
          },
        });
        stats.inserted.orders += 1;
        stats.inserted.orderItems += (order.items || []).length;
      }
    });

    const jsonHashAfter = fileHash(jsonPath);
    if (jsonHashBefore !== jsonHashAfter) {
      stats.errors.push("data/dandy.json changed during migration");
    }

    const db = {
      users: await prisma.user.count(),
      admins: await prisma.user.count({ where: { role: "ADMIN" } }),
      customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
      addresses: await prisma.address.count(),
      sessions: await prisma.session.count(),
      tokens: await prisma.authToken.count(),
      carts: await prisma.cart.count(),
      cartItems: await prisma.cartItem.count(),
      wishlists: await prisma.wishlist.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      products: await prisma.product.count(),
    };

    const hashCheck = await prisma.user.findMany({ select: { id: true, passwordHash: true, role: true } });
    const hashesOk = hashCheck.every((u) => looksLikeBcrypt(u.passwordHash));
    const jsonHashesOk = users.every((u) => {
      const row = hashCheck.find((h) => h.id === u.id);
      return row && row.passwordHash === u.passwordHash;
    });

    console.log("--- D1 result ---");
    console.log("JSON_UNTOUCHED:" + (jsonHashBefore === jsonHashAfter));
    console.log("HASHES_PRESERVED:" + hashesOk);
    console.log("HASHES_MATCH_JSON:" + jsonHashesOk);
    console.log("OUTBOX_SKIPPED:" + stats.skipped.outbox + " (no Outbox table; raw tokens not imported)");
    console.log("READ:" + JSON.stringify(stats.read));
    console.log("INSERTED:" + JSON.stringify(stats.inserted));
    console.log("SKIPPED:" + JSON.stringify(stats.skipped));
    console.log("CONFLICTS:" + stats.conflicts.length);
    if (stats.conflicts.length) console.log("CONFLICT_TYPES:" + stats.conflicts.join(" | "));
    console.log("ERRORS:" + stats.errors.length);
    if (stats.errors.length) console.log("ERROR_TYPES:" + stats.errors.join(" | "));
    console.log("DB_COUNTS:" + JSON.stringify(db));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("MIGRATION_FAILED");
  const msg = err && err.message ? String(err.message) : "unknown";
  console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
  process.exit(1);
});
