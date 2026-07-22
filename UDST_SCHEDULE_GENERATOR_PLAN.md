# UDST Schedule Generator

## 1. Product Goal

Build a web application that helps UDST students generate valid course schedules from screenshots of the section options displayed in PeopleSoft.

The application will:

1. Read course options from uploaded screenshots.
2. Exclude options marked `Closed`.
3. Choose exactly one complete option for each course.
4. Detect conflicts across lectures, laboratories, tutorials, and other meetings.
5. Generate multiple valid schedule scenarios.
6. Help the student compare and choose a preferred schedule.

The first version will recommend schedules only. It will not sign in to PeopleSoft or register courses automatically.

## 2. Current Understanding of UDST PeopleSoft

Based on the provided BUSG 2002 screenshot:

- A semester contains multiple courses.
- A course can contain several numbered registration options.
- An option can contain multiple required components, such as a lecture and a laboratory.
- The components inside an option form a fixed bundle.
- Each option has a status such as `Open`, `Wait List`, or `Closed`.
- PeopleSoft displays class numbers, section numbers, instructors, rooms, meeting dates, days, times, and seat availability.

Example:

```text
BUSG 2002 - Project Management
Option 1
Lecture: Thursday, 10:00 AM to 12:00 PM
Laboratory: Tuesday, 10:00 AM to 12:00 PM
Status: Open
```

Both meetings belong to option 1 and must be selected together.

## 3. Confirmed Scheduling Rules

### 3.1 Exactly One Option Per Course

Every complete schedule scenario must contain exactly one option from every course selected by the student.

If a student uploads four courses, each complete schedule must include one option from each of those four courses.

### 3.2 Options Are Indivisible Bundles

All components belonging to an option must remain together. The scheduler cannot combine a lecture from one option with a laboratory from another option.

### 3.3 Closed Options Are Always Excluded

Any option marked `Closed` must be removed before schedule generation. A closed option must never appear in a generated schedule.

### 3.4 Every Meeting Must Be Checked

Every lecture, laboratory, tutorial, or other meeting inside an option must be checked against all meetings already selected for the schedule.

Two meetings conflict when they occur on the same day and their time ranges overlap:

```text
firstStart < secondEnd AND secondStart < firstEnd
```

Classes that only touch at a boundary do not conflict by default. For example, a class ending at 12:00 PM can be followed by a class starting at 12:00 PM. A future travel-time preference could change this behavior.

### 3.5 A Conflict Rejects the Complete Scenario

If any meeting in an option conflicts with another selected course, that option combination is invalid. The scheduler must reject the entire scenario rather than remove one component from the option.

## 4. Proposed Waitlist Behavior

This rule still needs final confirmation.

Recommended behavior:

- Generate primary schedules using `Open` options.
- Permanently exclude `Closed` options.
- Provide an `Include waitlisted options` setting.
- Clearly identify schedules containing waitlisted options.
- Rank schedules containing only open options above schedules containing waitlisted options.

## 5. Data to Extract

The application should extract the following information from each screenshot:

- Academic term
- Course code
- Course name
- Option number
- Option status
- Academic session
- Component type, such as lecture or laboratory
- Class number
- Section number
- Meeting day
- Start and end time
- Meeting start and end dates
- Room
- Instructor
- Open-seat or waitlist availability

Example structured data:

```json
{
  "term": "Fall 2026",
  "courseCode": "BUSG 2002",
  "courseName": "Project Management",
  "options": [
    {
      "optionNumber": 1,
      "status": "open",
      "session": "Regular Academic Session",
      "meetings": [
        {
          "component": "lecture",
          "classNumber": "1134",
          "sectionNumber": "11",
          "day": "Thursday",
          "startTime": "10:00",
          "endTime": "12:00",
          "room": "12.2.44",
          "instructor": "Tahira Jehan Makda"
        },
        {
          "component": "laboratory",
          "classNumber": "1135",
          "sectionNumber": "12",
          "day": "Tuesday",
          "startTime": "10:00",
          "endTime": "12:00",
          "room": "12.2.44",
          "instructor": "Tahira Jehan Makda"
        }
      ],
      "startDate": "2026-08-25",
      "endDate": "2026-12-03",
      "openSeats": 12,
      "capacity": 40
    }
  ]
}
```

## 6. Student Workflow

### Step 1: Start a Semester Plan

The student selects a semester, such as Fall 2026.

### Step 2: Upload Screenshots

The student uploads one or more PeopleSoft screenshots for each course. The upload interface should support PNG, JPG, and JPEG files and warn students to remove names, student IDs, email addresses, and other private information.

### Step 3: Extract Course Information

Image recognition extracts all course options and converts them into validated structured data.

### Step 4: Review the Extraction

The student reviews and edits the extracted data before schedule generation. The application should highlight uncertain values, especially:

- Course codes
- Days
- Times
- AM versus PM
- Section numbers
- Registration statuses

### Step 5: Choose Preferences

Initial preferences can include:

- Include waitlisted options
- Earliest acceptable class time
- Latest acceptable class time
- Preferred instructors
- Days to avoid
- Minimize gaps between classes
- Minimize the number of campus days
- Add travel time between classes

### Step 6: Generate Schedules

The scheduling engine chooses exactly one eligible option per course and rejects every combination containing a conflict.

### Step 7: Compare Results

Each result should display:

- A weekly calendar
- The selected option for every course
- Lecture, laboratory, and tutorial details
- Instructor names
- Registration status
- Number of campus days
- Total gap time
- Warnings for waitlisted options

### Step 8: Save or Export

The student can save a schedule, export it as an image or PDF, and copy the selected PeopleSoft class numbers before registering manually.

## 7. Schedule Generation Algorithm

A backtracking algorithm should generate valid combinations efficiently:

```text
1. Remove all closed options.
2. Apply the student's waitlist setting.
3. Sort courses by the number of eligible options.
4. Select the next course.
5. Try one complete option from that course.
6. Compare every meeting in the option with meetings already selected.
7. Reject the branch immediately if any meeting conflicts.
8. Continue to the next course when there is no conflict.
9. Save the scenario when every course has exactly one option.
10. Rank all valid scenarios using the student's preferences.
```

Conflict validation must be deterministic application code. AI should extract information from screenshots but must not decide whether a schedule is valid.

## 8. Schedule Ranking

After finding conflict-free schedules, the application can score them using:

1. Open options over waitlisted options
2. Preferred instructors
3. Fewer campus days
4. Smaller gaps between classes
5. Preferred start and end times
6. Fewer long consecutive class blocks

Example result:

```text
Schedule A: 94/100

- Open options only
- Classes on three days
- No classes before 10:00 AM
- Only one 60-minute gap
- Includes a preferred instructor
```

Schedule validity and preference ranking must remain separate. A schedule is first validated and then scored.

## 9. Main Screens

The MVP should contain five main screens:

1. **Welcome:** Explain the application and start a semester plan.
2. **Upload:** Upload screenshots for each course.
3. **Review:** Confirm and edit extracted course options.
4. **Preferences:** Choose schedule preferences.
5. **Results:** Compare valid schedules on weekly calendars.

An optional export view can present the selected schedule in a clean printable format.

## 10. Recommended Technology

- Frontend: Next.js and TypeScript
- Styling: Tailwind CSS or a suitable component system
- Server: Next.js server routes
- Database: PostgreSQL
- Data validation: Zod
- Screenshot extraction: A vision-capable AI service with structured JSON output
- Scheduling engine: Deterministic TypeScript code
- Image storage: Temporary private object storage
- Deployment: Vercel with a managed PostgreSQL service

## 11. Privacy and Security

The application should:

- Tell students to hide names and student IDs before uploading images.
- Never request or store PeopleSoft passwords.
- Keep uploaded images private.
- Delete screenshots after extraction or after a short retention period.
- Avoid using student screenshots for model training.
- Allow students to delete saved plans.
- Require the student to confirm extracted information.

## 12. MVP Scope

The first release should include:

- Support for UDST PeopleSoft screenshots
- Multiple course uploads
- Editable extracted information
- Exactly one option per course
- Preservation of lecture, laboratory, and tutorial bundles
- Automatic exclusion of closed options
- Time-conflict detection
- Configurable waitlist filtering
- Weekly schedule results
- Basic preference ranking
- Image or PDF export

The first release should not include:

- Automatic PeopleSoft login
- Automatic course registration
- Support for every university
- Live seat monitoring
- Native mobile applications
- Payments
- Social features

## 13. Implementation Phases

### Phase 1: Screenshot Study

Collect anonymized screenshots covering lecture-only courses, lecture-and-laboratory courses, tutorials, multiple meeting days, different instructors, and all option statuses.

### Phase 2: Data Model

Define and validate the models for semesters, courses, options, meetings, registration statuses, preferences, and generated schedules.

### Phase 3: Scheduling Engine

Implement and test closed-option exclusion, one-option-per-course enforcement, bundle preservation, conflict detection, waitlist rules, schedule generation, and preference scoring.

### Phase 4: Screenshot Extraction

Implement image upload, structured extraction, confidence warnings, schema validation, and manual correction.

### Phase 5: User Interface

Build the upload experience, extraction review table, preference controls, weekly calendar, schedule comparison, and export functionality.

### Phase 6: Testing

Test with anonymized UDST screenshots and compare generated schedules with manually calculated expected results.

### Phase 7: Deployment

Deploy a private test version, collect feedback from a small group of UDST students, and improve extraction accuracy before a public release.

## 14. Acceptance Criteria

The MVP is successful when:

- A student can upload screenshots for at least two courses.
- The application correctly identifies the options in each screenshot.
- Closed options never appear in generated schedules.
- Every complete schedule contains exactly one option per course.
- All components belonging to an option remain together.
- No generated schedule contains overlapping meetings.
- The student can correct extraction mistakes.
- The student can compare multiple valid schedules.
- Open and waitlisted options are clearly distinguished.
- The selected schedule can be exported.

## 15. Remaining Decisions

1. Whether waitlisted options are excluded by default or included with a warning.
2. Whether the first version requires user accounts.
3. Whether uploaded screenshots are deleted immediately after extraction.
4. Whether back-to-back classes in different buildings require travel time.
5. How many schedule results should be displayed.
6. Which preferences are required for the MVP.
7. Whether manual course entry should be available when screenshot extraction fails.

## 16. Immediate Next Step

Collect more anonymized UDST PeopleSoft screenshots representing different course structures. These examples will be used to finalize the extraction schema and test the scheduling rules before implementation begins.
