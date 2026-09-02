import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = { role: "CUSTOMER" };
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  try {
    const customers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
        status: true,
      },
    });

    return Response.json({
      customers: customers.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
        lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
        emailVerified: c.emailVerified,
        status: c.status,
      })),
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
