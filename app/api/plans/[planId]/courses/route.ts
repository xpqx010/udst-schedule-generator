import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { PlanCourseResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections, type PlanCourseDocument } from "@/lib/server/collections";
import { fieldErrors, saveCourseSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ planId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const { planId } = await context.params;
    if (!ObjectId.isValid(planId)) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");
    const parsed = saveCourseSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted fields.", fieldErrors(parsed.error));

    const { plans } = await collections();
    const now = new Date();
    const course: PlanCourseDocument = {
      _id: new ObjectId(),
      code: parsed.data.code,
      codeKey: parsed.data.code.toLocaleLowerCase("en"),
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      screenshots: [],
      options: [],
      extractionStatus: "not_started",
      createdAt: now,
      updatedAt: now,
    };
    const result = await plans.updateOne(
      { _id: new ObjectId(planId), userId: user._id, "courses.codeKey": { $ne: course.codeKey } },
      { $push: { courses: course }, $set: { updatedAt: now } },
    );
    if (!result.matchedCount) {
      const plan = await plans.findOne({ _id: new ObjectId(planId), userId: user._id });
      if (!plan) return apiError(404, "PLAN_NOT_FOUND", "That term plan was not found.");
      return apiError(409, "COURSE_EXISTS", "This course is already in the term.", { code: "Use a different course code or edit the existing course." });
    }

    return NextResponse.json<PlanCourseResponse>({
      course: {
        id: course._id.toHexString(),
        code: course.code,
        ...(course.name ? { name: course.name } : {}),
        screenshots: [],
        options: [],
        extractionStatus: "not_started",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    return requestError(error);
  }
}
