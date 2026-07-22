import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Email is too long.");
const password = z.string().min(10, "Use at least 10 characters.").max(128, "Password must be 128 characters or fewer.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const signupSchema = z.object({ email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password });

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
