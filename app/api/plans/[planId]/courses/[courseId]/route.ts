import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { PlanCourseResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { deleteScreenshot } from "@/lib/server/screenshot-storage";
import { fieldErrors, saveCourseSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ planId: string; courseId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const { planId, courseId } = await context.params;
    if (!ObjectId.isValid(planId) || !ObjectId.isValid(courseId)) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const parsed = saveCourseSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted fields.", fieldErrors(parsed.error));

    const { plans } = await collections();
    const planObjectId = new ObjectId(planId);
    const courseObjectId = new ObjectId(courseId);
    const plan = await plans.findOne({ _id: planObjectId, userId: user._id });
    const existing = plan?.courses?.find((course) => course._id.equals(courseObjectId));
    if (!plan || !existing) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const codeKey = parsed.data.code.toLocaleLowerCase("en");
    if (plan.courses.some((course) => !course._id.equals(courseObjectId) && course.codeKey === codeKey)) {
      return apiError(409, "COURSE_EXISTS", "This course is already in the term.", { code: "Use a different course code or edit the existing course." });
    }

    const now = new Date();
    const courseFields = {
      "courses.$.code": parsed.data.code,
      "courses.$.codeKey": codeKey,
      "courses.$.updatedAt": now,
      updatedAt: now,
    };
    const updateResult = await plans.updateOne(
      {
        _id: planObjectId,
        userId: user._id,
        "courses._id": courseObjectId,
        courses: { $not: { $elemMatch: { _id: { $ne: courseObjectId }, codeKey } } },
      },
      parsed.data.name
        ? { $set: { ...courseFields, "courses.$.name": parsed.data.name } }
        : { $set: courseFields, $unset: { "courses.$.name": "" } },
    );
    if (!updateResult.matchedCount) {
      return apiError(409, "COURSE_EXISTS", "This course is already in the term.", { code: "Use a different course code or edit the existing course." });
    }
    return NextResponse.json<PlanCourseResponse>({
      course: {
        id: existing._id.toHexString(),
        code: parsed.data.code,
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        screenshots: (existing.screenshots ?? []).map((screenshot) => ({
          id: screenshot._id.toHexString(),
          originalName: screenshot.originalName,
          mimeType: screenshot.mimeType,
          size: screenshot.size,
          createdAt: screenshot.createdAt.toISOString(),
        })),
        options: existing.options ?? [],
        extractionStatus: existing.extractionStatus ?? "not_started",
        ...(existing.extractionError ? { extractionError: existing.extractionError } : {}),
        createdAt: existing.createdAt.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    return requestError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const { planId, courseId } = await context.params;
    if (!ObjectId.isValid(planId) || !ObjectId.isValid(courseId)) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const { plans } = await collections();
    const planObjectId = new ObjectId(planId);
    const courseObjectId = new ObjectId(courseId);
    const plan = await plans.findOne({ _id: planObjectId, userId: user._id });
    const course = plan?.courses?.find((item) => item._id.equals(courseObjectId));
    if (!plan || !course) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const result = await plans.updateOne(
      { _id: planObjectId, userId: user._id, "courses._id": courseObjectId },
      { $pull: { courses: { _id: courseObjectId } }, $set: { updatedAt: new Date() } },
    );
    if (!result.matchedCount) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const cleanup = await Promise.allSettled((course.screenshots ?? []).map((screenshot) => deleteScreenshot(screenshot.storageKey)));
    for (const result of cleanup) if (result.status === "rejected") console.error("Course screenshot cleanup failed", result.reason);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return requestError(error);
  }
}
