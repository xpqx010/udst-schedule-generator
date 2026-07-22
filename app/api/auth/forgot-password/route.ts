import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import { collections } from "@/lib/server/collections";
import { sendPasswordResetEmail } from "@/lib/server/email";
import { allowRequest, requestKey } from "@/lib/server/rate-limit";
import { fieldErrors, forgotPasswordSchema } from "@/lib/validation";

const GENERIC_MESSAGE = "If an account matches that email, a reset link has been sent.";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const rate = await allowRequest(requestKey(request, "forgot-password"), 5, 15 * 60 * 1000);
    if (!rate.allowed) return apiError(429, "RATE_LIMITED", `Too many requests. Try again in ${rate.retryAfter} seconds.`);
    const parsed = forgotPasswordSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted field.", fieldErrors(parsed.error));

    const { users, passwordResets } = await collections();
    const user = await users.findOne({ email: parsed.data.email });
    if (!user) return NextResponse.json({ message: GENERIC_MESSAGE });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await passwordResets.deleteMany({ userId: user._id });
    await passwordResets.insertOne({ userId: user._id, tokenHash, expiresAt, createdAt: new Date() });

    const appUrl = process.env.APP_URL || request.nextUrl.origin;
    try {
      const delivery = await sendPasswordResetEmail(user.email, `${appUrl}/reset-password?token=${token}`);
      return NextResponse.json({ message: GENERIC_MESSAGE, ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}) });
    } catch (error) {
      await passwordResets.deleteOne({ tokenHash });
      console.error("Password reset delivery failed", error);
      return apiError(503, "EMAIL_UNAVAILABLE", "We could not send the reset email. Please try again later.");
    }
  } catch (error) {
    return requestError(error);
  }
}
