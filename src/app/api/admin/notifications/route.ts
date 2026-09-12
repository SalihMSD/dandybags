import { requireAdmin } from "@/lib/auth/session";
import { jsonError, originOk } from "@/lib/auth/helpers";
import {
  listRecentNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/db/notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50;
    const [notifications, unreadCount] = await Promise.all([
      listRecentNotifications(limit),
      countUnreadNotifications(),
    ]);
    return Response.json({ notifications, unreadCount });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }
    return jsonError("Internal Server Error", 500);
  }
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Bad origin", 403);
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null) ?? null;
    const action = body?.action;
    if (action === "markAllRead") {
      await markAllNotificationsRead();
      return Response.json({ ok: true });
    }
    if (action === "markRead") {
      const id = body?.id;
      if (!id || typeof id !== "string") return jsonError("Missing id", 400);
      await markNotificationRead(id);
      return Response.json({ ok: true });
    }
    return jsonError("Invalid action", 400);
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }
    return jsonError("Internal Server Error", 500);
  }
}
