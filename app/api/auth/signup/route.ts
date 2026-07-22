import bcrypt from "bcryptjs";
import { MongoServerError, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { AuthResponse } from "@/lib/contracts";
import { createSessionToken, setSessionCookie } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { allowRequest, requestKey } from "@/lib/server/rate-limit";
import { fieldErrors, signupSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const rate = await allowRequest(requestKey(request, "signup"), 8, 15 * 60 * 1000);
    if (!rate.allowed) return apiError(429, "RATE_LIMITED", `Too many attempts. Try again in ${rate.retryAfter} seconds.`);
    const parsed = signupSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted fields.", fieldErrors(parsed.error));

    const { users } = await collections();
    const now = new Date();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = { _id: new ObjectId(), sessionVersion: 1 };
    const token = await createSessionToken(user);
    await users.insertOne({
      _id: user._id,
      email: parsed.data.email,
      passwordHash,
      sessionVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
    const response = NextResponse.json<AuthResponse>({
      user: { id: user._id.toHexString(), email: parsed.data.email, createdAt: now.toISOString() },
    }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return apiError(409, "EMAIL_IN_USE", "An account already uses this email.", { email: "Sign in or use a different email." });
    }
    return requestError(error);
  }
}
