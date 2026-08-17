import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { publicUser, type PublicUser, type Role } from "@/lib/db/store";
import { createDbSession, deleteSessionById, findValidSession } from "@/lib/db/sessions";
import { findUserById } from "@/lib/db/users";

const COOKIE = "dandy_session";
const DAYS = 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dandy-dev-auth-secret-change-me");
  }
  throw new Error("AUTH_SECRET is not configured.");
}

export async function createSession(userId: string, role: Role) {
  const expires = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000);
  const sessionId = await createDbSession(userId, expires);
  const token = await new SignJWT({ sid: sessionId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      const sid = String(payload.sid || "");
      if (sid) await deleteSessionById(sid);
    } catch {
      /* ignore invalid cookie */
    }
  }
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = String(payload.sub || "");
    const sid = String(payload.sid || "");
    const session = await findValidSession(sid, userId);
    if (!session) return null;
    const user = await findUserById(userId);
    if (!user || user.status !== "ACTIVE") return null;
    return publicUser(user);
  } catch {
    return null;
  }
}

export async function requireCustomer() {
  const user = await getSessionUser();
  if (!user || user.role !== "CUSTOMER") {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
