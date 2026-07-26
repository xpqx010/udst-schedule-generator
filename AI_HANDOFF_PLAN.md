# AI Handoff Plan: UDST Schedule Generator

Last updated: July 23, 2026

This file is the execution handoff for a new AI or developer. It describes the current repository state, fixed constraints, intended architecture, remaining work, and the recommended implementation order. Do not assume access to the conversation that produced this file.

## 1. Start Here

Before changing code, read these files in order:

1. `AGENTS.md` for mandatory architecture, security, reliability, and interface rules.
2. `PRODUCT.md` for product purpose and user-flow principles.
3. `DESIGN.md` for the visual system and interaction rules.
4. This file for current state and implementation order.
5. `README.md` for local setup and commands.
6. `UDST_SCHEDULE_GENERATOR_PLAN.md` for detailed scheduling research and domain background only.

When documents conflict, use this priority:

1. `AGENTS.md`
2. `PRODUCT.md` and `DESIGN.md`
3. This handoff
4. `UDST_SCHEDULE_GENERATOR_PLAN.md`

Important known conflict: the old plan recommends PostgreSQL and leaves accounts optional. The project rules require MongoDB and accounts from the start. The implemented application already uses MongoDB and mandatory authentication. Do not migrate it to PostgreSQL and do not add a guest flow.

## 2. Product Definition

Build a web application for UDST students that turns student-supplied PeopleSoft course screenshots into valid, inspectable schedule choices.

The final workflow is:

1. Create an account or sign in.
2. Create a term plan.
3. Enter the exact courses intended for that term.
4. Attach one or more PeopleSoft screenshots to each course.
5. Extract course options and all bundled meetings from the screenshots.
6. Review and correct extracted data, including uncertain values.
7. Set scheduling preferences.
8. Generate and rank conflict-free schedules.
9. Compare schedules and save a preferred schedule.
10. Export or copy the class numbers for manual PeopleSoft registration.

The application is a planning tool only. It must never request PeopleSoft credentials, sign in to PeopleSoft, register courses, invent unsupplied courses, or claim live seat availability.

## 3. Fixed Domain Rules

These are correctness rules, not preferences:

- A complete schedule contains exactly one option for every course in the plan.
- A registration option is an indivisible bundle. Its lecture, laboratory, tutorial, and other meetings stay together.
- Closed options are always excluded.
- Waitlisted options are included only when the user enables them and must be visibly labeled.
- Every meeting in a candidate option is checked against every selected meeting.
- Two meetings conflict when they share a day and `firstStart < secondEnd && secondStart < firstEnd`.
- Back-to-back meetings are allowed by default. A later travel-buffer preference may make them invalid.
- Any meeting conflict rejects the entire option combination.
- Schedule validity must be deterministic TypeScript code. AI may extract screenshot data but must not decide whether a schedule is valid.
- Ranking happens only after validity is established.
- Every displayed result must be traceable to user-entered courses and reviewed screenshot data.

## 4. Required Technology and Architecture

- Next.js 16 App Router with React 19 and TypeScript.
- Next.js route handlers under `app/api` provide all backend behavior.
- MongoDB is the only application database.
- Screens and UI components call API routes. They never import the database or MongoDB collections.
- Only route-handler execution paths may access MongoDB.
- Zod validates all external input on the server.
- Shared request and response types live in `lib/contracts.ts` or feature-specific contract modules under `lib`.
- Deterministic scheduling logic should be framework-independent TypeScript under `lib/scheduling` and have focused tests.
- Keep screenshots private and use short retention. Do not store image binary data directly in a normal MongoDB document.
- All user-owned reads and writes must authenticate the session and filter by `userId`.
- Every meaningful change must persist through an API route. Do not build a workflow whose only copy lives in component state.

## 5. Current Repository State

### Implemented

- Next.js 16 application shell and global design tokens.
- MongoDB connection helper and indexed collections.
- Email/password signup.
- Login and logout.
- Current-user endpoint.
- Forgot-password and reset-password flows.
- bcrypt password hashing with cost 12.
- Signed HTTP-only session cookie with a seven-day lifetime.
- Session invalidation through `sessionVersion` after a password reset.
- Same-origin checks for state-changing auth requests.
- MongoDB-backed rate limiting for sensitive auth endpoints.
- Atomic rate-limit counting under concurrent requests.
- Retryable MongoDB connection initialization after transient failures.
- Bcrypt-safe password byte-length validation.
- Password-reset delivery failures preserve previously delivered reset links.
- Structured API error shape with codes, messages, and optional field errors.
- Responsive and accessible authentication screens.
- Authenticated `/planner` shell with account loading, error, redirect, and logout states.
- Authenticated term-plan creation, listing, duplicate prevention, and deletion.
- User-owned `GET /api/plans`, `POST /api/plans`, and `DELETE /api/plans/[planId]` contracts.
- Responsive term-plan workspace with loading, empty, success, validation, API-error, and inline delete-confirmation states.
- Authenticated course creation, editing, listing, duplicate prevention, and deletion inside an owned term plan.
- User-owned course APIs under `/api/plans/[planId]/courses` and `/api/plans/[planId]/courses/[courseId]`.
- Responsive course-entry workspace with per-form validation, persistence feedback, and keyboard-safe edit/delete transitions.
- Private local screenshot upload, authenticated viewing, preview, per-course listing, and removal.
- PNG/JPEG signature validation, 5 MB file limit, five-image course limit, private no-store responses, and ownership enforcement.
- Screenshot cleanup when an image, course, or term plan is deleted; local files are excluded from version control.
- Editable option and bundled-meeting review with Open, Wait List, and Closed statuses, confidence warnings, manual entry, and explicit confirmation.
- Consent-gated OpenAI Responses API vision adapter with strict structured output, source screenshot provenance, provider failure states, and optimistic concurrency protection.
- User-owned option review API under `/api/plans/[planId]/courses/[courseId]/options` and extraction API under `/extract`.

### Not Implemented

- Automatic extraction in local use until `OPENAI_API_KEY` is configured; manual review is fully available without it.
- Extraction review and editing.
- Scheduling data models.
- Conflict detection and schedule generation in the Next.js application.
- Preference persistence and ranking.
- Results comparison.
- Saved schedule selection.
- PDF/image export.
- End-to-end tests.

The current `/planner` page intentionally says that planning features are not built yet. It is the next screen to replace.

### Existing Reference Prototype

The `design/` directory contains a standalone HTML/CSS/JavaScript prototype and scheduler tests. Treat it as interaction and algorithm research, not production architecture. Do not connect it directly to MongoDB or ship it as a parallel application. Reuse verified ideas by porting them into typed Next.js code and adding application tests.

### Important Files

- `app/(auth)/*`: account screens.
- `app/api/auth/*`: account route handlers.
- `app/planner/page.tsx`: planner route.
- `components/planner-shell.tsx`: current planner placeholder and session check.
- `lib/server/auth.ts`: session creation and authentication.
- `lib/server/collections.ts`: current MongoDB document types and indexes.
- `lib/api.ts`: API error and request helpers.
- `lib/contracts.ts`: current public API types.
- `lib/validation.ts`: auth validation schemas.
- `app/globals.css`: implemented visual tokens and screen styles.
- `tests/validation.test.mjs`: current automated tests.

## 6. Verified Baseline

Verified on July 23, 2026:

- `npm test`: passes, 9 tests.
- `npm run lint`: passes.
- `npm run build`: passes and generates all current routes.
- `npm run typecheck`: passes when run after the build.

One tooling caveat was observed: running `npm run typecheck` concurrently with `npm run build` can briefly fail because both commands read or replace generated `.next/types` files. Run build and typecheck sequentially, not in parallel.

Before each handoff, run:

```powershell
npm test
npm run lint
npm run build
npm run typecheck
```

## 7. Proposed Core Data Model

Keep MongoDB documents bounded and user-owned. Store dates as MongoDB dates for records and use normalized strings or integer minutes for academic meeting data where deterministic comparison is easier.

### Plan Document

Suggested `plans` collection:

```ts
type PlanDocument = {
  userId: ObjectId;
  term: {
    name: string;       // Example: Fall 2026
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
  };
  status: "courses" | "uploads" | "review" | "preferences" | "results";
  courses: CourseInput[];
  preferences: SchedulePreferences;
  selectedScheduleId?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

Use an index on `{ userId: 1, updatedAt: -1 }`. Every lookup, update, and delete must include both `_id` and the authenticated `userId`.

### Course and Extraction Data

```ts
type CourseInput = {
  id: string; // stable application-generated ID, not array index
  code: string;
  name?: string;
  screenshots: ScreenshotReference[];
  extractionStatus: "not_started" | "queued" | "processing" | "needs_review" | "confirmed" | "failed";
  options: CourseOption[];
};

type ScreenshotReference = {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: "image/png" | "image/jpeg";
  size: number;
  createdAt: string;
  deleteAfter: string;
};

type CourseOption = {
  id: string;
  optionNumber: string;
  status: "open" | "waitlist" | "closed";
  session?: string;
  meetings: Meeting[];
  openSeats?: number;
  capacity?: number;
  confidence?: ExtractionConfidence;
};

type Meeting = {
  id: string;
  component: "lecture" | "laboratory" | "tutorial" | "other";
  classNumber?: string;
  sectionNumber?: string;
  days: Weekday[];
  startMinutes: number; // minutes after midnight
  endMinutes: number;
  startDate?: string;
  endDate?: string;
  room?: string;
  instructor?: string;
  confidence?: ExtractionConfidence;
};

type ExtractionConfidence = {
  level: "high" | "medium" | "low";
  fields?: Record<string, "high" | "medium" | "low">;
};
```

Do not finalize these types without first checking actual anonymized screenshots and the reference prototype. In particular, confirm how PeopleSoft represents multi-day meetings, date ranges, asynchronous sections, TBA values, and option boundaries.

### Preferences

Start with the smallest useful preference set:

```ts
type SchedulePreferences = {
  includeWaitlist: boolean;
  earliestStartMinutes?: number;
  latestEndMinutes?: number;
  daysToAvoid: Weekday[];
  minimizeCampusDays: boolean;
  minimizeGaps: boolean;
};
```

Preferred instructors and travel buffers can follow after the basic generator is proven.

### Generated Results

Generated schedules can initially be computed on demand from confirmed plan data. Persist only the selected result or a generation snapshot if stable export/reopening requires it. Never persist a result without enough source version information to detect that course data or preferences changed afterward.

## 8. Proposed API Surface

All responses should use JSON except binary upload/download operations. All failures use the existing `ApiError` shape.

### Existing Auth API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Plan API

- `GET /api/plans`: list the authenticated user's plans.
- `POST /api/plans`: create a term plan.
- `GET /api/plans/[planId]`: return one owned plan.
- `PATCH /api/plans/[planId]`: update validated term, status, or preferences.
- `DELETE /api/plans/[planId]`: delete an owned plan and schedule screenshot cleanup.

### Course API

- `POST /api/plans/[planId]/courses`: add a course.
- `PATCH /api/plans/[planId]/courses/[courseId]`: update course identity or reviewed extraction data.
- `DELETE /api/plans/[planId]/courses/[courseId]`: remove a course and its screenshot references.

Use narrow route contracts rather than accepting a full client-supplied plan document. Prevent accidental overwrite of server-owned fields and concurrent work.

### Screenshot and Extraction API

- `POST /api/plans/[planId]/courses/[courseId]/screenshots`: validate and upload one or more images.
- `DELETE /api/plans/[planId]/courses/[courseId]/screenshots/[screenshotId]`: remove an image.
- `POST /api/plans/[planId]/courses/[courseId]/extract`: begin extraction for the course's screenshots.
- `GET /api/plans/[planId]/courses/[courseId]/extraction`: read extraction state if processing is asynchronous.
- `PUT /api/plans/[planId]/courses/[courseId]/options`: replace extracted options with a fully validated user-reviewed version.
- `POST /api/plans/[planId]/courses/[courseId]/confirm`: mark reviewed data as confirmed.

### Schedule API

- `POST /api/plans/[planId]/schedules/generate`: generate deterministic valid schedules from confirmed course data and saved preferences.
- `PUT /api/plans/[planId]/selection`: save or clear the selected schedule using a stable schedule fingerprint.
- `GET /api/plans/[planId]/export`: create a print/PDF-friendly export after the results screen is stable.

The precise URL layout may be simplified during implementation, but every feature must retain a reusable API contract and ownership checks.

## 9. Implementation Roadmap

Build vertical slices. After each screen, use the designer agent for critique, run an Impeccable review, fix material findings, and rerun the quality commands.

### Phase 0: Reconfirm Baseline

- Read the required documents.
- Start MongoDB and the app.
- Manually verify signup, login, logout, forgot password, reset password, and protected planner behavior.
- Add integration coverage for auth route behavior if the test setup can support an isolated test database.
- Do not redesign completed auth screens unless a real defect is found.

Exit criteria: auth works locally and baseline commands pass.

### Phase 1: Term Plans and Course Entry

- Add `plans` collection type and indexes.
- Add Zod request schemas and public plan contracts.
- Implement authenticated plan CRUD API routes.
- Implement course add, edit, and delete routes.
- Replace the planner placeholder with an explicit term-and-course workflow.
- Ask for course identities before showing screenshot controls.
- Include loading, empty, validation, save-success, API-error, and delete-confirmation behavior.
- Persist each meaningful change through the API.
- Handle stale or competing updates with an `updatedAt` precondition or revision number rather than silently overwriting newer work.

Exit criteria: a user can create, reopen, edit, and delete only their own term plans and courses; refresh loses no saved work.

### Phase 2: Scheduling Domain Engine

- Define normalized, framework-independent course, option, meeting, and preference types.
- Port only useful ideas from `design/assets/scheduler.js`.
- Implement closed-option filtering.
- Implement optional waitlist filtering.
- Implement date/day/time overlap checks.
- Implement indivisible option bundles.
- Implement one-option-per-course backtracking, sorting courses by eligible option count.
- Implement no-solution diagnostics without discarding plan data.
- Add ranking as a separate pure step after generation.
- Add schedule fingerprints based on selected course/option IDs and the source revision.

Required tests:

- Boundary-touching meetings do not conflict.
- Overlapping meetings on the same day conflict.
- Same times on different days do not conflict.
- Date ranges that do not overlap do not conflict if date-range support is enabled.
- Any component conflict rejects the whole option.
- Closed options never appear.
- Waitlisted options obey the setting.
- Every result has exactly one option from every course.
- Input data is not mutated.
- No eligible option and no valid combination produce clear empty outcomes.
- Ranking never changes validity.

Exit criteria: pure tests prove the complete scheduling invariants before extraction is connected.

### Phase 3: Private Screenshot Upload

- Decide the private object-storage provider before implementation.
- Document required environment variables in `.env.example` and setup in `README.md`.
- Validate authentication, plan ownership, MIME type, file signature, count, and size on the server.
- Accept PNG, JPG, and JPEG only for MVP.
- Use random storage keys; never trust original names as paths.
- Keep each screenshot visibly and persistently associated with exactly one course.
- Add privacy guidance before upload: remove names, student IDs, email addresses, and other private information.
- Define and implement deletion behavior for removed screenshots, deleted plans, extraction completion, and expired retention.
- Show upload progress, per-file errors, retry, empty state, and deletion state without losing successful files when another upload fails.

Exit criteria: authenticated users can upload multiple private images per course, cannot access another user's images, and can remove them reliably.

### Phase 4: Extraction and Review

- Choose a vision-capable provider that supports structured output.
- Keep provider code server-only and isolate it behind an extraction adapter.
- Build a strict Zod schema for model output.
- Treat model output as untrusted external input.
- Preserve source screenshot IDs and confidence metadata.
- Never silently discard partial extraction when one screenshot fails.
- Present all options and meetings in an editable review screen grouped by entered course and option bundle.
- Highlight uncertain course codes, option boundaries, days, AM/PM times, section numbers, and statuses.
- Require explicit confirmation before schedule generation.
- Provide manual entry when extraction fails or a field is TBA.
- Exclude closed options during generation, but retain and show them in review so the student can verify extraction.

Exit criteria: a user can inspect, correct, save, leave, reopen, and confirm extracted data; only confirmed data reaches generation.

### Phase 5: Preferences and Generation

- Add the initial preference controls and persist them through the plan API.
- Validate that all courses have at least one confirmed option before generation.
- Call the schedule route and run the deterministic engine server-side.
- Return valid results, ranking explanations, warnings, and a useful no-results explanation.
- Cap returned result count and define stable sorting for equal scores.
- Keep all-open results above waitlist-containing results unless product requirements explicitly change.

Exit criteria: multiple courses generate deterministic, conflict-free, ranked schedules and actionable no-result states.

### Phase 6: Results, Selection, and Export

- Build a weekly timetable plus a complete text summary.
- Preserve a readable minimum timetable width with horizontal overflow or an agenda alternative on narrow screens.
- Show course code, option number, component, class number, day/time, instructor, room, and status where available.
- Communicate course identity and status with text, not color alone.
- Let users compare results and persist one selection.
- Invalidate or clearly mark a saved selection when source course data or preferences change.
- Add a print stylesheet first; add generated PDF/image export only if it can remain accurate and accessible.
- Include the explicit statement that registration remains manual in PeopleSoft.

Exit criteria: a student can choose, reopen, inspect, print/export, and manually register from a complete set of class numbers.

### Phase 7: Hardening and Release

- Add end-to-end tests for the main successful workflow and critical failure paths.
- Test ownership attacks by replacing plan, course, screenshot, and selection IDs.
- Test invalid JSON, wrong content type, malformed IDs, oversized images, spoofed MIME types, extraction failures, and provider timeouts.
- Verify rate limits and cleanup jobs in the deployment environment.
- Verify keyboard navigation, focus visibility, labels, touch targets, contrast, responsive layouts, reduced motion, and print output.
- Test against anonymized UDST screenshots with known expected schedules.
- Add monitoring that excludes screenshot content, reset tokens, passwords, and sensitive extracted data.
- Document deployment, backup, retention, and incident procedures.

Exit criteria: all MVP acceptance criteria pass with representative anonymized data in a private test deployment.

## 10. UI Requirements for Every Screen

- Preserve the "Academic Planning Desk" direction in `DESIGN.md`.
- Use flat bordered work surfaces; avoid gradients, glass, decorative shadows, excessive rounded cards, and dashboard-like metric grids.
- Keep the workflow sequential: courses, screenshots, verification, preferences, schedules.
- Keep each screenshot and extracted option visibly tied to its entered course.
- Use Institutional Blue for action and state, not decoration.
- Use persistent labels and visible keyboard focus.
- Provide explicit loading, empty, success, validation, server-error, and retry states.
- Do not use optimistic updates where failure could hide unsaved academic data. If optimistic interaction is used, visibly reconcile failures and preserve the user's edits.
- Keep usable layouts from 320px mobile width through desktop.
- Prefer inline confirmation and disclosure over modals.
- Never make unsupported claims about extraction accuracy, seat availability, privacy, or registration success.

## 11. Security and Reliability Checklist

For every new route handler:

- Authenticate with `authenticatedUser` before reading or writing user data.
- Validate route IDs before constructing `ObjectId` values.
- Include `userId` in every owned-resource query.
- Validate body, query, and file input on the server.
- Apply `hasValidOrigin` to cookie-authenticated state changes.
- Return a structured `ApiError`; never fail silently.
- Avoid leaking whether another user's resource exists. Return the same not-found response for absent and unowned records.
- Rate-limit expensive extraction and generation routes.
- Avoid logging screenshot content, credentials, reset tokens, session cookies, or full model payloads containing student data.
- Preserve already successful writes when a later independent operation fails.
- Design cleanup as idempotent so retries are safe.

For screenshots and extraction:

- Store images privately with short-lived signed access when access is needed.
- Encrypt in transit and use provider encryption at rest.
- Delete images according to a documented retention policy.
- Do not use student screenshots for model training.
- Ensure the chosen AI provider's data-retention terms match product promises.

## 12. Testing Strategy

Use the smallest appropriate layer:

- Unit tests for Zod schemas, time normalization, conflicts, generation, ranking, and fingerprints.
- Route integration tests for validation, ownership, status codes, and structured errors.
- Component tests for complex review editing and state preservation if a component test runner is added.
- End-to-end tests for account creation through saved schedule and export.
- Manual visual and accessibility review for every completed screen.

Use isolated test database names and clean test-owned records only. Never point automated destructive tests at a shared or production database.

Representative fixtures must cover:

- Lecture-only options.
- Lecture and lab bundles.
- Tutorial bundles.
- Multiple meetings per component or option.
- Open, waitlist, and closed statuses.
- AM/PM ambiguity and TBA data.
- Same-day overlap and boundary-touching times.
- No-solution course combinations.
- Multiple screenshots for one course.
- Extraction failure in one file while other files succeed.

## 13. MVP Acceptance Criteria

The MVP is complete only when:

- A user must have an account and can recover access securely.
- A user can create and reopen a term plan.
- A user can enter at least two courses before uploading screenshots.
- A course can own multiple PNG or JPEG screenshots.
- Uploaded images remain private and are deleted according to policy.
- Extracted options are editable and require confirmation.
- Closed options never appear in generated schedules.
- Waitlisted options obey the user's setting and are clearly identified.
- Every result includes exactly one complete option from every entered course.
- Bundled components remain together.
- No result contains conflicting meetings under the defined rules.
- The user can understand why no schedule is available.
- The user can compare multiple schedules on mobile and desktop.
- A selected schedule persists and remains traceable to reviewed source data.
- The user can print/export all class numbers needed for manual registration.
- Ownership and input-validation tests pass for every user-data route.
- `npm test`, `npm run lint`, `npm run build`, and `npm run typecheck` pass sequentially.

## 14. Decisions Still Required

Do not silently choose these when implementation reaches them. Ask the user or document a justified decision:

1. Which private object-storage provider will hold screenshots?
2. Which vision/OCR provider is approved, and what are its retention and training terms?
3. Are screenshots deleted immediately after confirmed extraction, after a short fixed period, or when the plan is deleted?
4. What is the maximum file size, screenshots per course, and courses per plan?
5. What academic terms and date format should the term selector support?
6. How should TBA, asynchronous, weekend, and multi-day meetings be represented?
7. Are waitlisted options excluded by default? Recommended answer: yes.
8. How many generated results should be returned? Recommended starting cap: 20.
9. Should a travel-time buffer enter the MVP or remain post-MVP?
10. Is print-to-PDF sufficient for MVP, or is downloadable PDF/image generation required?

## 15. Immediate Next Task

Implement the next production slice: deterministic scheduling engine and its focused invariant tests.

Recommended order:

1. Move normalized scheduling types and pure logic into `lib/scheduling` without importing Next.js or MongoDB.
2. Implement closed-option exclusion, optional waitlist filtering, same-day overlap checks, indivisible bundles, and one-option-per-course backtracking.
3. Add deterministic no-solution outcomes and stable schedule fingerprints.
4. Add focused tests for all invariants and boundary-touching meetings.
5. Do not build preferences or results UI until the pure engine tests pass.
6. Run the full verification commands sequentially.
7. Update this handoff's current-state and baseline sections before stopping.

Do not begin screenshot extraction before durable plans and course ownership are working. The user's course list is the source boundary that prevents unrelated extracted courses from entering results.

## 16. Handoff Completion Template

At the end of each implementation session, update this file with:

```text
Completed:
- [specific behavior and API routes]

Changed files:
- [paths]

Verification:
- npm test: pass/fail
- npm run lint: pass/fail
- npm run build: pass/fail
- npm run typecheck: pass/fail
- manual checks: [what was checked]

Known issues:
- [specific issue, impact, and reproduction]

Next task:
- [one concrete vertical slice]

Decisions needed:
- [only unresolved decisions that block upcoming work]
```

Keep this file factual. Mark features complete only after implementation, persistence, error handling, authorization, responsive UI review, and verification are all complete.
