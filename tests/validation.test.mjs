import assert from "node:assert/strict";
import test from "node:test";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "../lib/validation.ts";

test("signup normalizes email and accepts a strong password", () => {
  const result = signupSchema.parse({ email: "  Student@Example.COM ", password: "Reliable123" });
  assert.equal(result.email, "student@example.com");
});

test("signup rejects passwords missing required character groups", () => {
  const result = signupSchema.safeParse({ email: "student@example.com", password: "alllowercase" });
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
