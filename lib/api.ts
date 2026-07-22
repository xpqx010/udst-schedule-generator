import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/lib/contracts";

export function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return NextResponse.json<ApiError>({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export async function readJson(request: NextRequest): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("UNSUPPORTED_MEDIA_TYPE");
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export function requestError(error: unknown) {
  if (error instanceof Error && error.message === "UNSUPPORTED_MEDIA_TYPE") return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send this request as JSON.");
  if (error instanceof Error && error.message === "INVALID_JSON") return apiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  console.error("Unhandled API error", error);
  return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
