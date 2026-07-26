export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export type CurrentUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: CurrentUser;
};

export type TermPlan = {
  id: string;
  term: string;
  courseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanCourse = {
  id: string;
  code: string;
  name?: string;
  screenshots: CourseScreenshot[];
  options: CourseOption[];
  extractionStatus: "not_started" | "needs_review" | "confirmed" | "failed";
  extractionError?: string;
  createdAt: string;
  updatedAt: string;
};

export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type MeetingComponent = "lecture" | "laboratory" | "tutorial" | "other";
export type ExtractionConfidence = "high" | "medium" | "low";

export type CourseMeeting = {
  id: string;
  component: MeetingComponent;
  classNumber?: string;
  sectionNumber?: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  room?: string;
  instructor?: string;
  confidence: ExtractionConfidence;
};

export type CourseOption = {
  id: string;
  optionNumber: string;
  status: "open" | "waitlist" | "closed";
  session?: string;
  meetings: CourseMeeting[];
  sourceScreenshotIds: string[];
  confidence: ExtractionConfidence;
};

export type CourseScreenshot = {
  id: string;
  originalName: string;
  mimeType: "image/png" | "image/jpeg";
  size: number;
  createdAt: string;
};

export type TermPlanDetail = TermPlan & {
  courses: PlanCourse[];
};

export type TermPlanResponse = {
  plan: TermPlan;
};

export type TermPlansResponse = {
  plans: TermPlan[];
};

export type TermPlanDetailResponse = {
  plan: TermPlanDetail;
};

export type PlanCourseResponse = {
  course: PlanCourse;
};

export type CourseScreenshotResponse = {
  screenshot: CourseScreenshot;
};

export type CourseOptionsResponse = {
  options: CourseOption[];
  extractionStatus: PlanCourse["extractionStatus"];
};
