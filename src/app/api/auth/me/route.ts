import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ user: null });
  return Response.json({ user });
}
