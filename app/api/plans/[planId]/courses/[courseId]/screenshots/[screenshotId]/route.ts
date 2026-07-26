import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, requestError } from "@/lib/api";
import { authenticatedUser } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { deleteScreenshot, loadScreenshot } from "@/lib/server/screenshot-storage";

type RouteContext = { params: Promise<{ planId: string; courseId: string; screenshotId: string }> };

async function ownedScreenshot(request: NextRequest, context: RouteContext) {
  const user = await authenticatedUser(request);
  if (!user) return { error: apiError(401, "UNAUTHENTICATED", "Sign in to continue.") };
  const { planId, courseId, screenshotId } = await context.params;
  if (!ObjectId.isValid(planId) || !ObjectId.isValid(courseId) || !ObjectId.isValid(screenshotId)) {
    return { error: apiError(404, "SCREENSHOT_NOT_FOUND", "That screenshot was not found.") };
  }
  const { plans } = await collections();
  const plan = await plans.findOne({ _id: new ObjectId(planId), userId: user._id });
  const course = plan?.courses?.find((item) => item._id.equals(courseId));
  const screenshot = course?.screenshots?.find((item) => item._id.equals(screenshotId));
  if (!plan || !course || !screenshot) return { error: apiError(404, "SCREENSHOT_NOT_FOUND", "That screenshot was not found.") };
  return { plans, user, plan, course, screenshot };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const owned = await ownedScreenshot(request, context);
    if ("error" in owned) return owned.error;
    const data = await loadScreenshot(owned.screenshot.storageKey);
    const encodedName = encodeURIComponent(owned.screenshot.originalName);
    return new NextResponse(data, {
      headers: {
        "content-type": owned.screenshot.mimeType,
        "content-length": String(data.length),
        "content-disposition": `inline; filename*=UTF-8''${encodedName}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return requestError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const owned = await ownedScreenshot(request, context);
    if ("error" in owned) return owned.error;
    const now = new Date();
    const result = await owned.plans.updateOne(
      { _id: owned.plan._id, userId: owned.user._id, "courses._id": owned.course._id, "courses.screenshots._id": owned.screenshot._id },
      { $pull: { "courses.$.screenshots": { _id: owned.screenshot._id } }, $set: { "courses.$.updatedAt": now, updatedAt: now } },
    );
    if (!result.matchedCount) return apiError(404, "SCREENSHOT_NOT_FOUND", "That screenshot was not found.");
    try {
      await deleteScreenshot(owned.screenshot.storageKey);
    } catch (cleanupError) {
      console.error("Screenshot file cleanup failed", cleanupError);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return requestError(error);
  }
}
