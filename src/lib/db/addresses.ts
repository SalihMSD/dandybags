import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import { isValidPhone, isValidPincode, normalizePhone } from "@/lib/auth/validate";

export type PublicAddress = {
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

export function publicAddress(row: {
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
}): PublicAddress {
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    landmark: row.landmark,
    isDefault: row.isDefault,
  };
}

export function parseAddressBody(body: Record<string, unknown>) {
  const fullName = String(body.fullName || "").trim();
  const phone = normalizePhone(String(body.phone || body.mobileNumber || ""));
  const line1 = String(body.line1 || body.addressLine1 || "").trim();
  const line2 = String(body.line2 || body.addressLine2 || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim();
  const pincode = String(body.pincode || "").trim();
  const landmark = String(body.landmark || "").trim();
  const isDefault = Boolean(body.isDefault);
  if (fullName.length < 2) return { ok: false as const, error: "Please enter the full name." };
  if (!isValidPhone(phone)) return { ok: false as const, error: "Please enter a valid mobile number." };
  if (line1.length < 4) return { ok: false as const, error: "Please enter address line 1." };
  if (!city || !state) return { ok: false as const, error: "Please enter city and state." };
  if (!isValidPincode(pincode)) return { ok: false as const, error: "Please enter a valid 6-digit pincode." };
  return { ok: true as const, fullName, phone, line1, line2, city, state, pincode, landmark, isDefault };
}

async function listForUser(userId: string) {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
  return rows.map(publicAddress);
}

export async function listAddresses(userId: string) {
  return listForUser(userId);
}

export async function createAddress(
  userId: string,
  data: Omit<PublicAddress, "id" | "userId">,
) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    const isDefault = data.isDefault || count === 0;
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    await tx.address.create({
      data: {
        id: newId("adr"),
        userId,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        landmark: data.landmark,
        isDefault,
      },
    });
    const rows = await tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    });
    return rows.map(publicAddress);
  });
}

export async function updateAddress(
  userId: string,
  id: string,
  data: Omit<PublicAddress, "id" | "userId">,
) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.address.findFirst({ where: { id, userId } });
    if (!row) return { ok: false as const, error: "Address not found." as const };

    await tx.address.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        landmark: data.landmark,
      },
    });

    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, NOT: { id } },
        data: { isDefault: false },
      });
      await tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    }

    const rows = await tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    });
    return { ok: true as const, addresses: rows.map(publicAddress) };
  });
}

export async function deleteAddress(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.address.deleteMany({ where: { id, userId } });
    const mine = await tx.address.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    });
    if (mine.length && !mine.some((a) => a.isDefault)) {
      await tx.address.update({
        where: { id: mine[0].id },
        data: { isDefault: true },
      });
    }
    const rows = await tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    });
    return rows.map(publicAddress);
  });
}
