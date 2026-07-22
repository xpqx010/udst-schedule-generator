import { collections } from "@/lib/server/collections";

export async function allowRequest(key: string, limit: number, windowMs: number) {
  const { rateLimits } = await collections();
  const now = new Date();
  const current = await rateLimits.findOne({ key });
  if (!current || current.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowMs);
    await rateLimits.updateOne({ key }, { $set: { count: 1, resetAt } }, { upsert: true });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000)) };
  }
  await rateLimits.updateOne({ key, resetAt: current.resetAt }, { $inc: { count: 1 } });
  return { allowed: true, retryAfter: 0 };
}

export function requestKey(request: Request, action: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${action}:${ip}`;
}
