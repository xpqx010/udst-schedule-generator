---
name: UDST Schedule Generator
description: A quiet, precise workspace for turning course screenshots into valid schedules.
colors:
  institutional-blue: "#2457D6"
  institutional-blue-dark: "#1947B8"
  institutional-blue-soft: "#E9EFFF"
  academic-ink: "#132B3D"
  utility-slate: "#5D6D79"
  structural-line: "#C8D1D7"
  neutral-canvas: "#F6F5F0"
  surface: "#FFFFFF"
  verified-green: "#147D64"
  verified-green-soft: "#E1F3ED"
  timetable-gold: "#9A650A"
  timetable-gold-soft: "#FFF2D3"
  control-line: "#7B8E9A"
  danger: "#A33131"
  danger-soft: "#FBE9E7"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(34px, 6vw, 52px)"
    fontWeight: 780
    lineHeight: 1.06
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 720
    lineHeight: 1.4
  supporting:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xs: "3px"
  sm: "5px"
  md: "6px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.institutional-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.institutional-blue-dark}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.institutional-blue}"
    rounded: "{rounded.sm}"
    padding: "0"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.academic-ink}"
    rounded: "{rounded.sm}"
    padding: "0 13px"
    height: "48px"
  upload-area:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.academic-ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  schedule-option-selected:
    backgroundColor: "{colors.institutional-blue-soft}"
    textColor: "{colors.academic-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
---

# Design System: UDST Schedule Generator

## Overview

**Creative North Star: "The Academic Planning Desk"**

The interface is a quiet, precise, trustworthy academic workspace. It should feel like a clear desk prepared for one consequential task: translating a student's own PeopleSoft evidence into schedules they can inspect and trust. Alignment, restrained color, and timetable geometry provide structure; decoration never competes with course data.

The experience is sequential rather than dashboard-driven. It moves from courses to screenshots to verification and schedules, with every screenshot and generated meeting visibly tied back to the course the student supplied. It explicitly rejects playful consumer-app styling and dense admin-dashboard composition.

**Key Characteristics:**
- Formal and institutional without becoming bureaucratic.
- Sequential, focused, and explicit about provenance.
- Flat, bordered work surfaces with compact controls.
- Familiar browser affordances and visible state changes.
- Responsive structure from narrow mobile screens to desktop.

## Colors

The palette pairs authoritative Institutional Blue with Academic Ink, neutral work surfaces, and narrowly scoped semantic colors.

### Primary
- **Institutional Blue:** Identifies the primary action, current workflow state, keyboard focus, and selected schedule option.
- **Deep Institutional Blue:** Appears only when a primary action is hovered or pressed.
- **Pale Selection Blue:** Provides a quiet selected or instructional fill without obscuring data.

### Secondary
- **Verified Green:** Communicates privacy guidance, confirmed extraction, open status, and conflict-free results; text must always accompany it.
- **Timetable Gold:** Relates meetings belonging to one course option inside the timetable; it is not a decorative accent.

### Neutral
- **Academic Ink:** Carries primary text and high-emphasis course data.
- **Utility Slate:** Carries instructions, metadata, times, and secondary labels.
- **Structural Line:** Defines fields, panels, dividers, and timetable geometry.
- **Neutral Canvas:** Separates the page ground from active white work surfaces.
- **Surface:** The white working plane for forms, upload rows, schedule choices, and results.

**The One-Action Rule.** Institutional Blue identifies action or state. It must never become general decoration.

**The Semantic Pairing Rule.** Green, gold, and blue states always include readable text, labels, or geometry; color alone never communicates meaning.

## Typography

**Display Font:** Inter with the system sans-serif stack.
**Body Font:** Inter with the system sans-serif stack.

**Character:** One familiar sans-serif family keeps the tool institutionally neutral and lets students scan course codes, class numbers, days, and times without adjusting to a decorative voice. Hierarchy comes from size, weight, and spacing.

### Hierarchy
- **Display** (780, `clamp(34px, 6vw, 52px)`, 1.06): Reserved for the single workflow introduction.
- **Title** (700, 25px, 1.2): Names each workflow stage and major result region.
- **Body** (400, 16px, 1.5): Provides instructions and explanations, capped near 70 characters per line.
- **Label** (720, 14px, 1.4): Labels fields, steps, and actions persistently.
- **Supporting data** (400-760, 9-13px): Fits timetable labels and metadata; use only where the surrounding structure supplies strong context.

**The Data Legibility Rule.** Course codes, class numbers, dates, statuses, and times must remain plainly readable. Never trade legibility for visual personality.

**The Single-Family Rule.** UI labels, buttons, and course data always use the product sans stack; display or decorative fonts are forbidden.

## Elevation

The system is flat and restrained. White surfaces against the neutral canvas, one-pixel structural lines, selected-state fills, and internal dividers establish hierarchy. Shadows are absent from the implemented vocabulary.

**The Flat Workspace Rule.** A surface must earn separation through task grouping before receiving a border. Decorative shadows and glass effects are forbidden.

## Components

Components are compact, familiar, and operational. Small corner radii soften controls without turning the interface into a collection of floating cards.

### Buttons
- **Shape:** Compact corners (5px) and practical touch targets (44-48px minimum height).
- **Primary:** Institutional Blue, white text, 48px minimum height, and 20px horizontal padding; labels describe the next action.
- **Hover / Focus:** Hover shifts to Deep Institutional Blue. Keyboard focus uses a visible three-pixel blue outline with a three-pixel offset.
- **Text:** Transparent, blue, and at least 44px high; used for additive actions such as adding another course.
- **Disabled / Loading:** Preserve dimensions, explain the unavailable state, and never substitute decorative motion for status text.

### Cards / Containers
- **Corner Style:** Square by default. Only interactive choices and bounded controls use the small radius.
- **Background:** White active surfaces sit on the neutral canvas.
- **Shadow Strategy:** None at rest or on hover.
- **Border:** One-pixel Structural Line; use dividers to preserve course ownership inside compound regions.
- **Internal Padding:** 16-26px according to information density.

### Inputs / Fields
- **Style:** White field, one-pixel boundary, 5px radius, 48px minimum height, and a persistent label.
- **Focus:** A visible blue outline outside the field boundary.
- **Error / Disabled:** Pair the state with direct text explaining what changed or what the student must do.
- **Help:** Place concise supporting copy directly below the relevant field rather than in a tooltip.

### Navigation
- **Style:** A restrained 68px header with a compact blue institutional mark, product name, and plain-language PeopleSoft scope note.
- **Behavior:** Keep the product identity visible; remove nonessential scope copy on narrow screens rather than compressing controls.

### Course Upload Area
- Each entered course owns one bordered upload row with a persistent course-identity column and a dashed file target.
- The file input accepts multiple PNG or JPEG screenshots.
- The course identity remains visible beside its files throughout extraction and review.
- Privacy guidance appears before the first upload action in a text-led green notice.
- At narrow widths, the identity column stacks above the target; ownership must remain unambiguous.

### Schedule Options and Timetable
- Schedule choices use compact bordered rows; selection adds Pale Selection Blue and a two-pixel Institutional Blue boundary.
- The timetable uses a regular day-and-time grid with text on every meeting.
- Meetings from one course remain visibly related through shared labels and semantic fills.
- The selected-options summary repeats the source details in text rather than relying on the grid alone.
- On narrow screens, preserve the timetable's readable minimum width with horizontal overflow or provide an agenda alternative; never shrink labels into illegibility.

## Do's and Don'ts

### Do:
- **Do** ask for course identities before presenting course-specific upload controls.
- **Do** allow multiple screenshots within every course upload area and keep each image associated with its course.
- **Do** reserve Institutional Blue for primary actions, current steps, focus, and selected states.
- **Do** preserve explicit text for Open, Wait List, Closed, conflict-free, and bundled-component states.
- **Do** use persistent labels, visible keyboard focus, semantic HTML, and practical touch targets.
- **Do** keep the workflow structurally readable from 320px mobile widths through desktop.
- **Do** use one consistent component vocabulary across courses, screenshots, verification, and schedules.

### Don't:
- **Don't** invent courses, sections, meetings, instructors, or results that the student did not supply.
- **Don't** make the product resemble playful consumer apps with gamification, decorative illustrations, or casual visual language.
- **Don't** use dense admin dashboards dominated by sidebars, metric cards, and unrelated system information.
- **Don't** wrap every region in a rounded card or add decorative shadows, gradients, glass effects, or ornamental motion.
- **Don't** encode course identity, registration status, or schedule validity with color alone.
- **Don't** use display fonts in labels, buttons, or course data, or reinvent familiar form controls for flavor.
- **Don't** use modals where inline disclosure or the next sequential stage can complete the task.
