import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { AuthResponse } from "@/lib/contracts";
import { createSessionToken, setSessionCookie } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { allowRequest, requestKey } from "@/lib/server/rate-limit";
import { fieldErrors, loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const rate = await allowRequest(requestKey(request, "login"), 10, 15 * 60 * 1000);
    if (!rate.allowed) return apiError(429, "RATE_LIMITED", `Too many attempts. Try again in ${rate.retryAfter} seconds.`);
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted fields.", fieldErrors(parsed.error));

    const { users } = await collections();
    const user = await users.findOne({ email: parsed.data.email });
    const validPassword = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !validPassword) return apiError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");

    const response = NextResponse.json<AuthResponse>({
      user: { id: user._id.toHexString(), email: user.email, createdAt: user.createdAt.toISOString() },
    });
    setSessionCookie(response, await createSessionToken(user));
    return response;
  } catch (error) {
    return requestError(error);
  }
}
