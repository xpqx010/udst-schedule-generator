import { ObjectId } from "mongodb";
import { database } from "@/lib/server/db";

export type UserDocument = {
  email: string;
  passwordHash: string;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PasswordResetDocument = {
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export type TermPlanDocument = {
  userId: ObjectId;
  term: string;
  termKey: string;
  courses: PlanCourseDocument[];
  createdAt: Date;
  updatedAt: Date;
};

export type PlanCourseDocument = {
  _id: ObjectId;
  code: string;
  codeKey: string;
  name?: string;
  screenshots: CourseScreenshotDocument[];
  options: CourseOptionDocument[];
  extractionStatus: "not_started" | "needs_review" | "confirmed" | "failed";
  extractionError?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CourseOptionDocument = {
  id: string;
  optionNumber: string;
  status: "open" | "waitlist" | "closed";
  session?: string;
  meetings: CourseMeetingDocument[];
  sourceScreenshotIds: string[];
  confidence: "high" | "medium" | "low";
};

export type CourseMeetingDocument = {
  id: string;
  component: "lecture" | "laboratory" | "tutorial" | "other";
  classNumber?: string;
  sectionNumber?: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string;
  endTime: string;
  room?: string;
  instructor?: string;
  confidence: "high" | "medium" | "low";
};

export type CourseScreenshotDocument = {
  _id: ObjectId;
  storageKey: string;
  originalName: string;
  mimeType: "image/png" | "image/jpeg";
  size: number;
  createdAt: Date;
};

type RateLimitDocument = {
  key: string;
  count: number;
  resetAt: Date;
};

let indexPromise: Promise<unknown> | undefined;

export async function collections() {
  const db = await database();
  const users = db.collection<UserDocument>("users");
  const passwordResets = db.collection<PasswordResetDocument>("password_resets");
  const rateLimits = db.collection<RateLimitDocument>("rate_limits");
  const plans = db.collection<TermPlanDocument>("plans");

  if (!indexPromise) {
    indexPromise = Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      passwordResets.createIndex({ tokenHash: 1 }, { unique: true }),
      passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      rateLimits.createIndex({ key: 1 }, { unique: true }),
      rateLimits.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
      plans.createIndex({ userId: 1, updatedAt: -1 }),
      plans.createIndex({ userId: 1, termKey: 1 }, { unique: true }),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  await indexPromise;
  return { users, passwordResets, rateLimits, plans };
}
