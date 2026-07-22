import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin } from "@/lib/api";
import { clearSessionCookie } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
