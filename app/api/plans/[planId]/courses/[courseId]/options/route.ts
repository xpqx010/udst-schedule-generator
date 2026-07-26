import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { CourseOptionsResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections } from "@/lib/server/collections";
import { fieldErrors, saveCourseOptionsSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ planId: string; courseId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
    const { planId, courseId } = await context.params;
    if (!ObjectId.isValid(planId) || !ObjectId.isValid(courseId)) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const parsed = saveCourseOptionsSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the option and meeting details.", fieldErrors(parsed.error));

    const { plans } = await collections();
    const planObjectId = new ObjectId(planId);
    const courseObjectId = new ObjectId(courseId);
    const plan = await plans.findOne({ _id: planObjectId, userId: user._id });
    const course = plan?.courses?.find((item) => item._id.equals(courseObjectId));
    if (!plan || !course) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    const ownedScreenshotIds = new Set((course.screenshots ?? []).map((screenshot) => screenshot._id.toHexString()));
    if (parsed.data.options.some((option) => option.sourceScreenshotIds.some((id) => !ownedScreenshotIds.has(id)))) {
      return apiError(400, "INVALID_SCREENSHOT_SOURCE", "An option references a screenshot that does not belong to this course.");
    }
    const now = new Date();
    const result = await plans.updateOne(
      { _id: planObjectId, userId: user._id, "courses._id": courseObjectId },
      {
        $set: { "courses.$.options": parsed.data.options, "courses.$.extractionStatus": "confirmed", "courses.$.updatedAt": now, updatedAt: now },
        $unset: { "courses.$.extractionError": "" },
      },
    );
    if (!result.matchedCount) return apiError(404, "COURSE_NOT_FOUND", "That course was not found.");
    return NextResponse.json<CourseOptionsResponse>({ options: parsed.data.options, extractionStatus: "confirmed" });
  } catch (error) {
    return requestError(error);
  }
}
