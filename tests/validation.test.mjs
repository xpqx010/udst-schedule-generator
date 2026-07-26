import assert from "node:assert/strict";
import test from "node:test";
import { createTermPlanSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema, saveCourseOptionsSchema, saveCourseSchema, signupSchema } from "../lib/validation.ts";

test("signup normalizes email and accepts a strong password", () => {
  const result = signupSchema.parse({ email: "  Student@Example.COM ", password: "Reliable123" });
  assert.equal(result.email, "student@example.com");
});

test("signup rejects passwords missing required character groups", () => {
  const result = signupSchema.safeParse({ email: "student@example.com", password: "alllowercase" });
  assert.equal(result.success, false);
});

test("signup rejects passwords beyond bcrypt's 72-byte limit", () => {
  const result = signupSchema.safeParse({ email: "student@example.com", password: `Reliable123${"x".repeat(62)}` });
  assert.equal(result.success, false);
});

test("login does not apply signup strength rules to existing passwords", () => {
  assert.equal(loginSchema.safeParse({ email: "student@example.com", password: "legacy" }).success, true);
});

test("password reset requires a token and a strong replacement password", () => {
  assert.equal(resetPasswordSchema.safeParse({ token: "a".repeat(64), password: "Replacement123" }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ token: "short", password: "Replacement123" }).success, false);
});

test("forgot password accepts only a valid email", () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success, false);
});

test("term plan normalizes whitespace and rejects empty names", () => {
  assert.equal(createTermPlanSchema.parse({ term: "  Fall   2026 " }).term, "Fall 2026");
  assert.equal(createTermPlanSchema.safeParse({ term: " " }).success, false);
});

test("course input normalizes codes and optional names", () => {
  const course = saveCourseSchema.parse({ code: "  busg   2002 ", name: " Project Management " });
  assert.deepEqual(course, { code: "BUSG 2002", name: "Project Management" });
  assert.equal(saveCourseSchema.safeParse({ code: "BUSG/2002", name: "" }).success, false);
});

test("course option review requires valid times and bundled meetings", () => {
  const option = {
    id: "0f75e1e0-85d4-4cf1-9fb5-f8750c36a3d2",
    optionNumber: "1",
    status: "open",
    confidence: "high",
    sourceScreenshotIds: [],
    meetings: [{ id: "4add835f-e5bd-472b-83af-32c580b6fca8", component: "lecture", day: "Monday", startTime: "09:00", endTime: "11:00", confidence: "high" }],
  };
  assert.equal(saveCourseOptionsSchema.safeParse({ options: [option] }).success, true);
  assert.equal(saveCourseOptionsSchema.safeParse({ options: [{ ...option, meetings: [] }] }).success, false);
  assert.equal(saveCourseOptionsSchema.safeParse({ options: [{ ...option, meetings: [{ ...option.meetings[0], endTime: "08:00" }] }] }).success, false);
});
