"use client";

import { useState } from "react";
import type { ApiError, CourseMeeting, CourseOption, CourseOptionsResponse, PlanCourse, Weekday } from "@/lib/contracts";

const weekdays: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function newMeeting(): CourseMeeting {
  return { id: crypto.randomUUID(), component: "lecture", day: "" as Weekday, startTime: "", endTime: "", confidence: "low" };
}

function newOption(number: number): CourseOption {
  return { id: crypto.randomUUID(), optionNumber: String(number), status: "open", meetings: [newMeeting()], sourceScreenshotIds: [], confidence: "low" };
}

export function ExtractionReview({ planId, course, onCourseChange, onClose }: { planId: string; course: PlanCourse; onCourseChange: (course: PlanCourse) => void; onClose: () => void }) {
  const [options, setOptions] = useState<CourseOption[]>(course.options);
  const [consent, setConsent] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(course.extractionError ?? "");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmingOption, setConfirmingOption] = useState<string | null>(null);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [activity, setActivity] = useState("");

  function updateOption(optionId: string, change: Partial<CourseOption>) {
    setOptions((current) => current.map((option) => option.id === optionId ? { ...option, ...change } : option));
    setDirty(true);
    setError(""); setNotice("");
  }

  function updateMeeting(optionId: string, meetingId: string, change: Partial<CourseMeeting>) {
    setOptions((current) => current.map((option) => option.id === optionId ? { ...option, meetings: option.meetings.map((meeting) => meeting.id === meetingId ? { ...meeting, ...change } : meeting) } : option));
    setDirty(true);
    setError(""); setNotice("");
  }

  async function extract() {
    setExtracting(true); setError(""); setNotice(""); setActivity("Automatic extraction started.");
    try {
      const response = await fetch(`/api/plans/${planId}/courses/${course.id}/extract`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent, replaceExisting: options.length > 0 }),
      });
      const body = await response.json().catch(() => null) as CourseOptionsResponse | ApiError | null;
      if (!body) throw new Error("The extraction service returned an unreadable response.");
      if (!response.ok) throw new Error((body as ApiError).error.message);
      const result = body as CourseOptionsResponse;
      setOptions(result.options);
      setDirty(true);
      setReplaceConfirmed(false);
      onCourseChange({ ...course, options: result.options, extractionStatus: result.extractionStatus, extractionError: undefined });
      setNotice(`Extracted ${result.options.length} ${result.options.length === 1 ? "option" : "options"}. Review every field before saving.`);
      setActivity("Automatic extraction completed. Review every field.");
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Could not extract the screenshots. Enter the options manually.");
      setActivity("Automatic extraction failed.");
    } finally { setExtracting(false); }
  }

  async function save() {
    const invalidMeeting = options.some((option) => !option.optionNumber.trim() || option.meetings.some((meeting) => !meeting.day || !meeting.startTime || !meeting.endTime || meeting.startTime >= meeting.endTime));
    if (invalidMeeting) {
      setError("Complete every required option, day, and time. End times must be after start times.");
      return;
    }
    setSaving(true); setError(""); setNotice(""); setActivity("Saving reviewed options.");
    try {
      const response = await fetch(`/api/plans/${planId}/courses/${course.id}/options`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ options }),
      });
      const body = await response.json().catch(() => null) as CourseOptionsResponse | ApiError | null;
      if (!body) throw new Error("The review service returned an unreadable response.");
      if (!response.ok) throw new Error((body as ApiError).error.message);
      const result = body as CourseOptionsResponse;
      setOptions(result.options);
      setDirty(false);
      onCourseChange({ ...course, options: result.options, extractionStatus: result.extractionStatus, extractionError: undefined });
      setNotice(`${course.code} options were reviewed and saved.`);
      setActivity("Reviewed options saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the reviewed options.");
      setActivity("Saving reviewed options failed.");
    } finally { setSaving(false); }
  }

  return <section className="extraction-review" aria-labelledby="extraction-review-title" aria-busy={extracting || saving || undefined}>
    <span className="visually-hidden" aria-live="polite">{activity}</span>
    <header className="review-header"><div><p className="context-label">Step 3 of 4 · Verify options</p><h3 id="extraction-review-title" tabIndex={-1}>{course.code} option review</h3><p>Keep lectures, laboratories, and tutorials together exactly as shown in PeopleSoft.</p></div>{confirmClose ? <div className="close-review-confirm"><span>Discard unsaved changes?</span><button className="danger-button" type="button" onClick={onClose}>Discard</button><button className="quiet-button" type="button" onClick={() => setConfirmClose(false)}>Keep reviewing</button></div> : <button className="quiet-button" type="button" onClick={() => dirty ? setConfirmClose(true) : onClose()}>Close review</button>}</header>

    {(error || notice) && <div className={error ? "form-alert review-feedback" : "success-panel review-feedback"} role={error ? "alert" : "status"}><strong>{error ? "Review action failed" : "Review updated"}</strong><span>{error || notice}</span></div>}

    <div className="extraction-actions">
      <div><strong>Automatic extraction</strong><p>Sends copies of this course’s screenshots to the configured OpenAI API with storage disabled. OpenAI processing and retention still follow the API account’s current data controls.</p><label className="consent-control"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I consent to sending these screenshots to OpenAI for extraction.</label>{options.length > 0 && <label className="consent-control"><input type="checkbox" checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)} /> Replace the current option draft with a new extraction.</label>}</div>
      <button className="secondary-button" type="button" onClick={extract} disabled={!consent || extracting || !course.screenshots.length || (options.length > 0 && !replaceConfirmed)}>{extracting ? "Extracting…" : options.length ? "Extract again" : "Extract screenshots"}</button>
    </div>

    <div className="manual-review-heading"><div><h4>Editable options</h4><p>Automatic extraction is optional. Add or correct every value manually.</p></div><button className="secondary-button" type="button" onClick={() => { setOptions((current) => [...current, newOption(current.length + 1)]); setDirty(true); }}>Add option manually</button></div>

    {options.length === 0 ? <div className="review-empty"><strong>No options to review</strong><p>Run extraction after uploading screenshots, or add the first option manually.</p></div> : <div className="option-review-list">{options.map((option, optionIndex) => <article className={option.confidence === "low" ? "option-review low-confidence" : "option-review"} key={option.id} aria-labelledby={`option-title-${option.id}`}>
      <header><h5 id={`option-title-${option.id}`}>Option {option.optionNumber || optionIndex + 1}</h5><div className="option-labels"><span>{option.status === "open" ? "Open" : option.status === "waitlist" ? "Wait List" : "Closed"}</span>{option.status === "closed" && <span>Excluded from generation</span>}{option.confidence === "low" && <span>Low confidence · Check carefully</span>}</div></header>
      <div className="option-fields"><label>Option number<input required value={option.optionNumber} maxLength={30} onChange={(event) => updateOption(option.id, { optionNumber: event.target.value })} /></label><label>Status<select value={option.status} onChange={(event) => updateOption(option.id, { status: event.target.value as CourseOption["status"] })}><option value="open">Open</option><option value="waitlist">Wait list</option><option value="closed">Closed</option></select></label><label>Academic session<input value={option.session ?? ""} maxLength={100} placeholder="Regular Academic Session" onChange={(event) => updateOption(option.id, { session: event.target.value || undefined })} /></label></div>
      <div className="meeting-review-list">{option.meetings.map((meeting, meetingIndex) => <fieldset className={meeting.confidence === "low" ? "meeting-review low-confidence" : "meeting-review"} key={meeting.id}><legend>Meeting {meetingIndex + 1}</legend>{meeting.confidence === "low" && <p className="confidence-warning">Low confidence: verify this meeting against the screenshot.</p>}<div className="meeting-fields"><label>Component<select required value={meeting.component} onChange={(event) => updateMeeting(option.id, meeting.id, { component: event.target.value as CourseMeeting["component"] })}><option value="lecture">Lecture</option><option value="laboratory">Laboratory</option><option value="tutorial">Tutorial</option><option value="other">Other</option></select></label><label>Day<select required value={meeting.day} onChange={(event) => updateMeeting(option.id, meeting.id, { day: event.target.value as Weekday })}><option value="">Choose day</option>{weekdays.map((day) => <option key={day}>{day}</option>)}</select></label><label>Start time<input required type="time" value={meeting.startTime} onChange={(event) => updateMeeting(option.id, meeting.id, { startTime: event.target.value })} /></label><label>End time<input required type="time" value={meeting.endTime} onChange={(event) => updateMeeting(option.id, meeting.id, { endTime: event.target.value })} /></label><label>Class number<input value={meeting.classNumber ?? ""} maxLength={30} onChange={(event) => updateMeeting(option.id, meeting.id, { classNumber: event.target.value || undefined })} /></label><label>Section<input value={meeting.sectionNumber ?? ""} maxLength={30} onChange={(event) => updateMeeting(option.id, meeting.id, { sectionNumber: event.target.value || undefined })} /></label><label>Room<input value={meeting.room ?? ""} maxLength={100} onChange={(event) => updateMeeting(option.id, meeting.id, { room: event.target.value || undefined })} /></label><label>Instructor<input value={meeting.instructor ?? ""} maxLength={100} onChange={(event) => updateMeeting(option.id, meeting.id, { instructor: event.target.value || undefined })} /></label></div><button className="quiet-button" type="button" disabled={option.meetings.length === 1} onClick={() => updateOption(option.id, { meetings: option.meetings.filter((item) => item.id !== meeting.id) })}>Remove meeting</button></fieldset>)}</div>
      <div className="option-actions"><button className="secondary-button" type="button" onClick={() => updateOption(option.id, { meetings: [...option.meetings, newMeeting()] })}>Add meeting</button>{confirmingOption === option.id ? <div className="remove-option-confirm"><span>Remove this option?</span><button className="danger-button" type="button" onClick={() => { setOptions((current) => current.filter((item) => item.id !== option.id)); setConfirmingOption(null); setDirty(true); }}>Yes, remove</button><button className="quiet-button" type="button" onClick={() => setConfirmingOption(null)}>Cancel</button></div> : <button className="quiet-button" type="button" onClick={() => setConfirmingOption(option.id)}>Remove option</button>}</div>
    </article>)}</div>}

    <div className="review-save"><div><strong>Confirm the reviewed data</strong><p>Saving marks these options as student-reviewed. Closed options remain visible here but will never enter generated schedules.</p></div><button className="primary-button" type="button" onClick={save} disabled={saving || options.length === 0}>{saving ? "Saving review…" : "Save reviewed options"}</button></div>
  </section>;
}
