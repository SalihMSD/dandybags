import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { newId, publicUser, readStore, type PublicUser, type Role, updateStore } from "@/lib/db/store";

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
  const sessionId = newId("ses");
  const expires = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000);
  await updateStore((s) => {
    s.sessions = s.sessions.filter((x) => x.userId !== userId || new Date(x.expiresAt) > new Date());
    s.sessions.push({
      id: sessionId,
      userId,
      expiresAt: expires.toISOString(),
      createdAt: new Date().toISOString(),
    });
  });
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
        await updateStore((s) => {
          s.sessions = s.sessions.filter((x) => x.id !== sid);
        });
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
    const store = readStore();
    const session = store.sessions.find((x) => x.id === sid && x.userId === userId);
    if (!session || new Date(session.expiresAt) < new Date()) return null;
    const user = store.users.find((u) => u.id === userId);
    if (!user || user.status !== "ACTIVE") return null;
    return publicUser(user);
  } catch {
    return null;
  }
}

export async function requireCustomer() {
  const user = await getSessionUser();
  if (!user || user.role !== "CUSTOMER") {
    const err = new Error("UNAUTHORIZED");
    throw err;
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
