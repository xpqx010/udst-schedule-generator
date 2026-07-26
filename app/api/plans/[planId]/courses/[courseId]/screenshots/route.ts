import { randomUUID } from "node:crypto";
import path from "node:path";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, requestError } from "@/lib/api";
import type { CourseScreenshotResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections, type CourseScreenshotDocument } from "@/lib/server/collections";
import { allowRequest, requestKey } from "@/lib/server/rate-limit";
import { deleteScreenshot, storeScreenshot } from "@/lib/server/screenshot-storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SCREENSHOTS = 5;
type RouteContext = { params: Promise<{ planId: string; courseId: string }> };

function detectedType(data: Uint8Array): CourseScreenshotDocument["mimeType"] | null {
  if (data.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => data[index] === byte)) return "image/png";
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  return null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const rate = await allowRequest(requestKey(request, `screenshot-upload:${user._id.toHexString()}`), 30, 15 * 60 * 1000);
    if (!rate.allowed) return apiError(429, "RATE_LIMITED", `Too many uploads. Try again in ${rate.retryAfter} seconds.`);
    const { planId, courseId } = await context.params;
    if (!ObjectId.isValid(planId) || !ObjectId.isValid(courseId)) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Upload this screenshot as form data.");
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FILE_SIZE + 512 * 1024) return apiError(413, "FILE_TOO_LARGE", "Each screenshot must be 5 MB or smaller.");

    const { plans } = await collections();
    const planObjectId = new ObjectId(planId);
    const courseObjectId = new ObjectId(courseId);
    const plan = await plans.findOne({ _id: planObjectId, userId: user._id });
    const course = plan?.courses?.find((item) => item._id.equals(courseObjectId));
    if (!plan || !course) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    if ((course.screenshots?.length ?? 0) >= MAX_SCREENSHOTS) return apiError(409, "SCREENSHOT_LIMIT", "This course already has the maximum of five screenshots.");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError(400, "FILE_REQUIRED", "Choose a PNG or JPEG screenshot.");
    if (!file.size) return apiError(400, "EMPTY_FILE", "The selected screenshot is empty.");
    if (file.size > MAX_FILE_SIZE) return apiError(413, "FILE_TOO_LARGE", "Each screenshot must be 5 MB or smaller.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectedType(bytes);
    if (!mimeType) return apiError(415, "INVALID_IMAGE", "The file content must be a valid PNG or JPEG image.");

    const extension = mimeType === "image/png" ? "png" : "jpg";
    const storageKey = `${randomUUID()}.${extension}`;
    const now = new Date();
    const screenshot: CourseScreenshotDocument = {
      _id: new ObjectId(),
      storageKey,
      originalName: path.basename(file.name).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || `screenshot.${extension}`,
      mimeType,
      size: file.size,
      createdAt: now,
    };

    await storeScreenshot(storageKey, bytes);
    try {
      const result = await plans.updateOne(
        { _id: planObjectId, userId: user._id, "courses._id": courseObjectId },
        { $push: { "courses.$.screenshots": screenshot }, $set: { "courses.$.updatedAt": now, updatedAt: now } },
      );
      if (!result.matchedCount) {
        await deleteScreenshot(storageKey);
        return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
      }
    } catch (databaseError) {
      await deleteScreenshot(storageKey);
      throw databaseError;
    }

    return NextResponse.json<CourseScreenshotResponse>({ screenshot: { id: screenshot._id.toHexString(), originalName: screenshot.originalName, mimeType, size: screenshot.size, createdAt: now.toISOString() } }, { status: 201 });
  } catch (error) {
    return requestError(error);
  }
}
