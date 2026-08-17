/**
 * In-process memory limiter. Known limitation (unchanged in E3):
 * counters reset on server restart and are not shared across instances.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const row = windows.get(key);
  if (!row || row.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (row.count >= limit) {
    return { ok: false, remaining: 0 };
  }
  row.count += 1;
  return { ok: true, remaining: limit - row.count };
}

export function clientKey(request: Request, extra = "") {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || "local";
  return `${ip}:${extra}`;
}
