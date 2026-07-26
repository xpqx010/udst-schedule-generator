import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, requestError } from "@/lib/api";
import type { CourseScreenshot, PlanCourse, TermPlanDetailResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections, type PlanCourseDocument } from "@/lib/server/collections";
import { deleteScreenshot } from "@/lib/server/screenshot-storage";

type RouteContext = { params: Promise<{ planId: string }> };

function serializeCourse(course: PlanCourseDocument): PlanCourse {
  return {
    id: course._id.toHexString(),
    code: course.code,
    ...(course.name ? { name: course.name } : {}),
    screenshots: (course.screenshots ?? []).map((screenshot): CourseScreenshot => ({
      id: screenshot._id.toHexString(),
      originalName: screenshot.originalName,
      mimeType: screenshot.mimeType,
      size: screenshot.size,
      createdAt: screenshot.createdAt.toISOString(),
    })),
    options: course.options ?? [],
    extractionStatus: course.extractionStatus ?? "not_started",
    ...(course.extractionError ? { extractionError: course.extractionError } : {}),
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const { planId } = await context.params;
    if (!ObjectId.isValid(planId)) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");

    const { plans } = await collections();
    const plan = await plans.findOne({ _id: new ObjectId(planId), userId: user._id });
    if (!plan) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");
    const courses = plan.courses ?? [];
    return NextResponse.json<TermPlanDetailResponse>({
      plan: {
        id: plan._id.toHexString(),
        term: plan.term,
        courseCount: courses.length,
        courses: courses.map(serializeCourse),
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
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

    const { planId } = await context.params;
    if (!ObjectId.isValid(planId)) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");

    const { plans } = await collections();
    const plan = await plans.findOne({ _id: new ObjectId(planId), userId: user._id });
    if (!plan) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");
    const result = await plans.deleteOne({ _id: plan._id, userId: user._id });
    if (!result.deletedCount) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");
    const screenshots = (plan.courses ?? []).flatMap((course) => course.screenshots ?? []);
    const cleanup = await Promise.allSettled(screenshots.map((screenshot) => deleteScreenshot(screenshot.storageKey)));
    for (const result of cleanup) if (result.status === "rejected") console.error("Plan screenshot cleanup failed", result.reason);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return requestError(error);
  }
}
