import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { AuthResponse } from "@/lib/contracts";
import { createSessionToken, setSessionCookie } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { allowRequest, requestKey } from "@/lib/server/rate-limit";
import { fieldErrors, resetPasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const rate = await allowRequest(requestKey(request, "reset-password"), 8, 15 * 60 * 1000);
    if (!rate.allowed) return apiError(429, "RATE_LIMITED", `Too many attempts. Try again in ${rate.retryAfter} seconds.`);
    const parsed = resetPasswordSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted field.", fieldErrors(parsed.error));

    const { users, passwordResets } = await collections();
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const reset = await passwordResets.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!reset) return apiError(400, "INVALID_RESET_TOKEN", "This reset link is invalid or has expired. Request a new one.");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await users.updateOne({ _id: reset.userId }, { $set: { passwordHash, updatedAt: new Date() }, $inc: { sessionVersion: 1 } });
    const user = await users.findOne({ _id: reset.userId });
    if (!user) return apiError(400, "INVALID_RESET_TOKEN", "This account is no longer available.");
    await passwordResets.deleteMany({ userId: user._id });

    const response = NextResponse.json<AuthResponse>({
      user: { id: user._id.toHexString(), email: user.email, createdAt: user.createdAt.toISOString() },
    });
    setSessionCookie(response, await createSessionToken(user));
    return response;
  } catch (error) {
    return requestError(error);
  }
}
