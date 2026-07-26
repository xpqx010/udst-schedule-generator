import { MongoServerError, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { apiError, hasValidOrigin, readJson, requestError } from "@/lib/api";
import type { TermPlan, TermPlanResponse, TermPlansResponse } from "@/lib/contracts";
import { authenticatedUser } from "@/lib/server/auth";
import { collections, type TermPlanDocument } from "@/lib/server/collections";
import { createTermPlanSchema, fieldErrors } from "@/lib/validation";

function serializePlan(plan: TermPlanDocument & { _id: ObjectId }): TermPlan {
  return {
    id: plan._id.toHexString(),
    term: plan.term,
    courseCount: plan.courses?.length ?? 0,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const { plans } = await collections();
    const ownedPlans = await plans.find({ userId: user._id }).sort({ updatedAt: -1 }).toArray();
    return NextResponse.json<TermPlansResponse>({ plans: ownedPlans.map(serializePlan) });
  } catch (error) {
    return requestError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return apiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  try {
    const user = await authenticatedUser(request);
    if (!user) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");

    const parsed = createTermPlanSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Check the highlighted field.", fieldErrors(parsed.error));

    const { plans } = await collections();
    const now = new Date();
    const plan = {
      _id: new ObjectId(),
      userId: user._id,
      term: parsed.data.term,
      termKey: parsed.data.term.toLocaleLowerCase("en"),
      courses: [],
      createdAt: now,
      updatedAt: now,
    };
    await plans.insertOne(plan);
    return NextResponse.json<TermPlanResponse>({ plan: serializePlan(plan) }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return apiError(409, "TERM_EXISTS", "You already have a plan for this term.", { term: "Use a different term name or open the existing plan." });
    }
    return requestError(error);
  }
}
