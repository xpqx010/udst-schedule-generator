import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { CourseOptionsResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { ExtractionProviderError, extractCourseOptions } from "@/lib/server/openai-extraction";
import { allowRequest, requestKey } from "@/lib/server/rate-limit";
import { loadScreenshot } from "@/lib/server/screenshot-storage";
import { extractCourseSchema, fieldErrors } from "@/lib/validation";

type RouteContext = { params: Promise<{ planId: string; courseId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
    const rate = await allowRequest(requestKey(request, `extract:${user._id.toHexString()}`), 10, 60 * 60 * 1000);
    if (!rate.allowed) return apiError(429, "RATE_LIMITED", `Too many extraction requests. Try again in ${rate.retryAfter} seconds.`);
    const { planId, courseId } = await context.params;
    if (!ObjectId.isValid(planId) || !ObjectId.isValid(courseId)) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const parsed = extractCourseSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Confirm the extraction request.", fieldErrors(parsed.error));

    const { plans } = await collections();
    const planObjectId = new ObjectId(planId);
    const courseObjectId = new ObjectId(courseId);
    const plan = await plans.findOne({ _id: planObjectId, userId: user._id });
    const course = plan?.courses?.find((item) => item._id.equals(courseObjectId));
    if (!plan || !course) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    if (!(course.screenshots?.length)) return apiError(409, "SCREENSHOTS_REQUIRED", "Upload at least one screenshot before extraction.");
    if ((course.options?.length ?? 0) && !parsed.data.replaceExisting) return apiError(409, "REVIEW_EXISTS", "This course already has reviewed or extracted options. Confirm replacement before extracting again.");
    const courseUpdatedAt = course.updatedAt;

    try {
      const images = await Promise.all(course.screenshots.map(async (screenshot) => ({ id: screenshot._id.toHexString(), mimeType: screenshot.mimeType, data: await loadScreenshot(screenshot.storageKey) })));
      const options = await extractCourseOptions({ code: course.code, ...(course.name ? { name: course.name } : {}), images });
      const now = new Date();
      const result = await plans.updateOne(
        { _id: planObjectId, userId: user._id, courses: { $elemMatch: { _id: courseObjectId, updatedAt: courseUpdatedAt } } },
        {
          $set: { "courses.$.options": options, "courses.$.extractionStatus": "needs_review", "courses.$.updatedAt": now, updatedAt: now },
          $unset: { "courses.$.extractionError": "" },
        },
      );
      if (!result.matchedCount) return apiError(409, "COURSE_CHANGED", "The course changed while extraction was running. Your newer work was preserved; review it before trying again.");
      return NextResponse.json<CourseOptionsResponse>({ options, extractionStatus: "needs_review" });
    } catch (error) {
      const providerError = error instanceof ExtractionProviderError
        ? error
        : new ExtractionProviderError("EXTRACTION_FAILED", "Automatic extraction failed. Your screenshots and existing review were preserved; try again or enter options manually.", 502);
      const now = new Date();
      const failureResult = await plans.updateOne(
        { _id: planObjectId, userId: user._id, courses: { $elemMatch: { _id: courseObjectId, updatedAt: courseUpdatedAt } } },
        { $set: { "courses.$.extractionStatus": "failed", "courses.$.extractionError": providerError.message, "courses.$.updatedAt": now, updatedAt: now } },
      );
      if (!failureResult.matchedCount) return apiError(409, "COURSE_CHANGED", "The course changed while extraction was running. Your newer work was preserved.");
      return apiError(providerError.status, providerError.code, providerError.message);
    }
  } catch (error) {
    return requestError(error);
  }
}
