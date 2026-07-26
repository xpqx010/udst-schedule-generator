import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { CourseOption } from "@/lib/contracts";
import { saveCourseOptionsSchema } from "@/lib/validation";

type ExtractionImage = { id: string; mimeType: "image/png" | "image/jpeg"; data: Buffer };
type ExtractionCourse = { code: string; name?: string; images: ExtractionImage[] };

const rawMeeting = z.object({
  component: z.enum(["lecture", "laboratory", "tutorial", "other"]),
  classNumber: z.string().nullable(),
  sectionNumber: z.string().nullable(),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  room: z.string().nullable(),
  instructor: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});
const rawExtraction = z.object({ options: z.array(z.object({
  optionNumber: z.string().min(1),
  status: z.enum(["open", "waitlist", "closed"]),
  session: z.string().nullable(),
  meetings: z.array(rawMeeting).min(1),
  sourceScreenshotIndexes: z.array(z.number().int().min(0)),
  confidence: z.enum(["high", "medium", "low"]),
})).min(1).max(50) });

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    options: {
      type: "array",
      minItems: 1,
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          optionNumber: { type: "string" },
          status: { type: "string", enum: ["open", "waitlist", "closed"] },
          session: { type: ["string", "null"] },
          meetings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                component: { type: "string", enum: ["lecture", "laboratory", "tutorial", "other"] },
                classNumber: { type: ["string", "null"] },
                sectionNumber: { type: ["string", "null"] },
                day: { type: "string", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
                startTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" },
                endTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" },
                room: { type: ["string", "null"] },
                instructor: { type: ["string", "null"] },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["component", "classNumber", "sectionNumber", "day", "startTime", "endTime", "room", "instructor", "confidence"],
            },
          },
          sourceScreenshotIndexes: { type: "array", items: { type: "integer", minimum: 0 } },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["optionNumber", "status", "session", "meetings", "sourceScreenshotIndexes", "confidence"],
      },
    },
  },
  required: ["options"],
} as const;

export class ExtractionProviderError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

function responseText(body: unknown) {
  const output = (body as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }> })?.output;
  for (const item of output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal") throw new ExtractionProviderError("EXTRACTION_REFUSED", "The extraction provider could not process these screenshots. Enter the options manually.", 422);
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new ExtractionProviderError("EXTRACTION_EMPTY", "The extraction provider returned no usable data. Enter the options manually or try again.", 502);
}

export async function extractCourseOptions(course: ExtractionCourse): Promise<CourseOption[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ExtractionProviderError("EXTRACTION_NOT_CONFIGURED", "Automatic extraction is not configured. Add OPENAI_API_KEY or enter the options manually.", 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const imageContent = course.images.map((image) => ({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.data.toString("base64")}`, detail: "high" }));
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        store: false,
        input: [{ role: "user", content: [
          { type: "input_text", text: `Extract only the PeopleSoft registration options for ${course.code}${course.name ? ` - ${course.name}` : ""} from the attached screenshots. Options are indivisible bundles: keep every lecture, laboratory, tutorial, or other meeting displayed under one option together. Do not invent missing values. Use null for unavailable optional text. Convert times to 24-hour HH:MM. Include closed options so the student can verify them. sourceScreenshotIndexes are zero-based indexes of images that support each option.` },
          ...imageContent,
        ] }],
        text: { format: { type: "json_schema", name: "udst_course_options", strict: true, schema } },
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("OpenAI extraction request failed", response.status, (body as { error?: { code?: string } })?.error?.code);
      throw new ExtractionProviderError("EXTRACTION_PROVIDER_ERROR", "Automatic extraction is temporarily unavailable. Your screenshots are safe; try again or enter options manually.", 502);
    }
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(responseText(body)); }
    catch (error) {
      if (error instanceof ExtractionProviderError) throw error;
      throw new ExtractionProviderError("EXTRACTION_INVALID_JSON", "The extraction result was unreadable. Enter the options manually or try again.", 502);
    }
    const parsed = rawExtraction.safeParse(parsedJson);
    if (!parsed.success) throw new ExtractionProviderError("EXTRACTION_INVALID", "The extraction result failed validation. Enter the options manually or try again.", 502);
    const options: CourseOption[] = parsed.data.options.map((option) => ({
      id: randomUUID(),
      optionNumber: option.optionNumber.trim(),
      status: option.status,
      ...(option.session?.trim() ? { session: option.session.trim() } : {}),
      sourceScreenshotIds: [...new Set(option.sourceScreenshotIndexes.filter((index) => index < course.images.length).map((index) => course.images[index].id))],
      confidence: option.confidence,
      meetings: option.meetings.map((meeting) => ({
        id: randomUUID(), component: meeting.component, day: meeting.day, startTime: meeting.startTime, endTime: meeting.endTime, confidence: meeting.confidence,
        ...(meeting.classNumber?.trim() ? { classNumber: meeting.classNumber.trim() } : {}),
        ...(meeting.sectionNumber?.trim() ? { sectionNumber: meeting.sectionNumber.trim() } : {}),
        ...(meeting.room?.trim() ? { room: meeting.room.trim() } : {}),
        ...(meeting.instructor?.trim() ? { instructor: meeting.instructor.trim() } : {}),
      })),
    }));
    const validated = saveCourseOptionsSchema.safeParse({ options });
    if (!validated.success) throw new ExtractionProviderError("EXTRACTION_INVALID", "The extraction result contained invalid meeting data. Enter the options manually or try again.", 502);
    return validated.data.options;
  } catch (error) {
    if ((error as Error).name === "AbortError") throw new ExtractionProviderError("EXTRACTION_TIMEOUT", "Automatic extraction took too long. Your screenshots are safe; try again or enter options manually.", 504);
    throw error;
  } finally { clearTimeout(timeout); }
}
