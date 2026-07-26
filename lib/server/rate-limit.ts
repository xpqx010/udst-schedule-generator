import { collections } from "@/lib/server/collections";

export async function allowRequest(key: string, limit: number, windowMs: number) {
  const { rateLimits } = await collections();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const current = await rateLimits.findOneAndUpdate(
    { key },
    [{
      $set: {
        count: { $cond: [{ $gt: ["$resetAt", now] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
        resetAt: { $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", resetAt] },
      },
    }],
    { upsert: true, returnDocument: "after" },
  );
  if (!current) throw new Error("Rate limit state was not saved.");
  return {
    allowed: current.count <= limit,
    retryAfter: current.count <= limit ? 0 : Math.max(1, Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export function requestKey(request: Request, action: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${action}:${ip}`;
}
