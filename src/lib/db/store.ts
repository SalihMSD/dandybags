import { randomBytes, createHash } from "crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";

export type Role = "CUSTOMER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "DISABLED";

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  customerType?: string;
  companyName?: string;
  gstin?: string;
};

export type AddressRecord = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  isDefault: boolean;
};

export type CartItemRecord = {
  sku: string;
  slug: string;
  name: string;
  qty: number;
  image: string;
};

export type CartRecord = {
  userId: string;
  items: CartItemRecord[];
  updatedAt: string;
};

export type WishlistRecord = {
  userId: string;
  sku: string;
  addedAt: string;
};

export type OrderItemRecord = CartItemRecord;

export type OrderRecord = {
  id: string;
  userId: string;
  items: OrderItemRecord[];
  totalLabel: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  orderStatus: "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  shippingAddress: Omit<AddressRecord, "id" | "userId" | "isDefault">;
  createdAt: string;
};

export type TokenRecord = {
  id: string;
  userId: string;
  type: "VERIFY_EMAIL" | "RESET_PASSWORD";
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
};

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type Store = {
  users: UserRecord[];
  addresses: AddressRecord[];
  carts: CartRecord[];
  wishlist: WishlistRecord[];
  orders: OrderRecord[];
  tokens: TokenRecord[];
  sessions: SessionRecord[];
  outbox: { at: string; to: string; subject: string; text: string }[];
};

const empty = (): Store => ({
  users: [],
  addresses: [],
  carts: [],
  wishlist: [],
  orders: [],
  tokens: [],
  sessions: [],
  outbox: [],
});

const filePath = join(process.cwd(), "data", "dandy.json");
let queue: Promise<unknown> = Promise.resolve();
let cache: Store | null = null;

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("hex");
}

function load(): Store {
  if (cache) return cache;
  if (!existsSync(filePath)) {
    cache = empty();
    return cache;
  }
  try {
    cache = JSON.parse(readFileSync(filePath, "utf8")) as Store;
    cache.users ??= [];
    cache.addresses ??= [];
    cache.carts ??= [];
    cache.wishlist ??= [];
    cache.orders ??= [];
    cache.tokens ??= [];
    cache.sessions ??= [];
    cache.outbox ??= [];
    return cache;
  } catch {
    cache = empty();
    return cache;
  }
}

function persist(store: Store) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmp, filePath);
  cache = store;
}

export function readStore(): Store {
  return load();
}

export async function updateStore<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const store = load();
    const result = await fn(store);
    persist(store);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function publicUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  emailVerified: boolean;
  status: AccountStatus | string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    status: user.status,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
