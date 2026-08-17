import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import { hashPassword } from "@/lib/db/password";
import { normalizeEmail } from "@/lib/auth/validate";

export function isUniqueConstraint(error: unknown, field?: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  if (!field) return true;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === "string") return target.includes(field);
  return false;
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findAdminByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, role: "ADMIN" } });
}

export async function findCustomerByEmailOrPhone(email: string, phone: string) {
  return prisma.user.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });
}

export async function createCustomer(data: {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      id: newId("usr"),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: false,
      lastLoginAt: null,
    },
  });
}

export async function touchLastLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function setEmailVerified(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
}

export async function setPasswordHash(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateCustomerProfile(
  userId: string,
  data: { fullName: string; email: string; phone: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CUSTOMER") {
    return { ok: false as const, error: "Please log in.", status: 401 as const };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: userId } },
    select: { id: true },
  });
  if (emailTaken) {
    return { ok: false as const, error: "An account already exists with this email.", status: 400 as const };
  }

  const phoneTaken = await prisma.user.findFirst({
    where: { phone: data.phone, NOT: { id: userId } },
    select: { id: true },
  });
  if (phoneTaken) {
    return { ok: false as const, error: "An account already exists with this mobile number.", status: 400 as const };
  }

  const emailChanged = user.email !== data.email;
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        ...(emailChanged ? { emailVerified: false } : {}),
      },
    });
    return { ok: true as const, user: updated, emailChanged };
  } catch (error) {
    if (isUniqueConstraint(error, "email")) {
      return { ok: false as const, error: "An account already exists with this email.", status: 400 as const };
    }
    if (isUniqueConstraint(error, "phone")) {
      return { ok: false as const, error: "An account already exists with this mobile number.", status: 400 as const };
    }
    return { ok: false as const, error: "Something went wrong. Please try again.", status: 500 as const };
  }
}

const ADMIN_PLACEHOLDER_PHONE = "9000000000";

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalized = normalizeEmail(email);
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", email: normalized },
  });
  if (existingAdmin) return;

  const emailTaken = await prisma.user.findUnique({ where: { email: normalized } });
  if (emailTaken) return;

  const phoneTaken = await prisma.user.findUnique({ where: { phone: ADMIN_PLACEHOLDER_PHONE } });
  if (phoneTaken) return;

  await prisma.user.create({
    data: {
      id: newId("usr"),
      fullName: "DANDY Admin",
      email: normalized,
      phone: ADMIN_PLACEHOLDER_PHONE,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      lastLoginAt: null,
    },
  });
}
