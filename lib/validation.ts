import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Email is too long.");
const password = z.string().min(10, "Use at least 10 characters.").max(128, "Password must be 128 characters or fewer.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be 72 bytes or fewer.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const signupSchema = z.object({ email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password });
export const createTermPlanSchema = z.object({
  term: z.string().trim().min(2, "Enter a term name.").max(60, "Term name must be 60 characters or fewer.")
    .transform((value) => value.replace(/\s+/g, " ")),
});

const courseCode = z.string().trim().min(2, "Enter a course code.").max(24, "Course code must be 24 characters or fewer.")
  .transform((value) => value.replace(/\s+/g, " ").toUpperCase())
  .refine((value) => /^[A-Z0-9][A-Z0-9 -]*$/.test(value), "Use letters, numbers, spaces, or hyphens only.");
const courseName = z.string().trim().max(100, "Course name must be 100 characters or fewer.")
  .transform((value) => value || undefined)
  .optional();

export const saveCourseSchema = z.object({ code: courseCode, name: courseName });

const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || undefined).optional();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 09:30.");
export const meetingSchema = z.object({
  id: z.string().uuid(),
  component: z.enum(["lecture", "laboratory", "tutorial", "other"]),
  classNumber: optionalText(30),
  sectionNumber: optionalText(30),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  startTime: time,
  endTime: time,
  room: optionalText(100),
  instructor: optionalText(100),
  confidence: z.enum(["high", "medium", "low"]),
}).refine((meeting) => meeting.startTime < meeting.endTime, { message: "End time must be after start time.", path: ["endTime"] });

export const courseOptionSchema = z.object({
  id: z.string().uuid(),
  optionNumber: z.string().trim().min(1, "Enter an option number.").max(30),
  status: z.enum(["open", "waitlist", "closed"]),
  session: optionalText(100),
  meetings: z.array(meetingSchema).min(1, "Add at least one meeting.").max(20),
  sourceScreenshotIds: z.array(z.string().regex(/^[0-9a-f]{24}$/i, "Source screenshot ID is invalid.")).max(5),
  confidence: z.enum(["high", "medium", "low"]),
}).superRefine((option, context) => {
  const meetingIds = option.meetings.map((meeting) => meeting.id);
  if (new Set(meetingIds).size !== meetingIds.length) context.addIssue({ code: "custom", message: "Meeting IDs must be unique.", path: ["meetings"] });
  if (new Set(option.sourceScreenshotIds).size !== option.sourceScreenshotIds.length) context.addIssue({ code: "custom", message: "Source screenshots must be unique.", path: ["sourceScreenshotIds"] });
});

export const saveCourseOptionsSchema = z.object({ options: z.array(courseOptionSchema).min(1, "Add at least one course option.").max(50) }).superRefine((data, context) => {
  const optionIds = data.options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) context.addIssue({ code: "custom", message: "Option IDs must be unique.", path: ["options"] });
});
export const extractCourseSchema = z.object({ consent: z.literal(true, { error: "Confirm that the screenshots may be sent to the configured extraction provider." }), replaceExisting: z.boolean().optional().default(false) });

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
