import { NextRequest, NextResponse } from "next/server";
import { apiError, requestError } from "@/lib/api";
import type { AuthResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
    return NextResponse.json<AuthResponse>({
      user: { id: user._id.toHexString(), email: user.email, createdAt: user.createdAt.toISOString() },
    });
  } catch (error) {
    return requestError(error);
  }
}
