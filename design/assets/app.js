(function () {
  "use strict";

  const engine = window.ScheduleEngine;
  const steps = ["courses", "screenshots", "verify", "results"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const dayValues = ["sun", "mon", "tue", "wed", "thu"];
  let idCounter = 0;
  let activeVerificationCourseId = null;

  function uid(prefix) {
    idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
  }

  function newMeeting() {
    return { id: uid("meeting"), component: "lecture", classNumber: "", section: "", day: "sun", start: "", end: "", room: "" };
  }

  function newOption() {
    return { id: uid("option"), number: "", status: "open", meetings: [newMeeting()] };
  }

  function newCourse(code) {
    return { id: uid("course"), code: code || "", files: [], options: [newOption()], confirmed: false };
  }

  function initialState() {
    return { term: "", currentStep: "courses", courses: [newCourse()], results: [], selectedResultId: null };
  }

  function restoreState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem("udst-schedule-draft"));
      if (!saved || !Array.isArray(saved.courses) || !saved.courses.length) return initialState();
      saved.currentStep = "courses";
      saved.results = [];
      saved.selectedResultId = null;
      saved.courses.forEach((course) => {
        course.files = [];
        course.confirmed = false;
        if (!Array.isArray(course.options) || !course.options.length) course.options = [newOption()];
      });
      return saved;
    } catch (_) {
      return initialState();
    }
  }

  let state = restoreState();

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function saveDraft() {
    const draft = {
      term: state.term,
      currentStep: "courses",
      courses: state.courses.map((course) => ({
        id: course.id,
        code: course.code,
        files: [],
        options: course.options,
        confirmed: false
      })),
      results: [],
      selectedResultId: null
    };
    sessionStorage.setItem("udst-schedule-draft", JSON.stringify(draft));
  }

  function announce(message) {
    const status = $("#live-status");
    status.textContent = "";
    window.setTimeout(() => { status.textContent = message; }, 20);
  }

  function showErrors(containerId, messages) {
    const container = $(containerId);
    if (!messages.length) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `<strong>Please fix the following:</strong><ul>${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>`;
    container.hidden = false;
    container.focus?.();
    container.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function goToStep(step, options) {
    if (!steps.includes(step)) return;
    state.currentStep = step;
    steps.forEach((name) => { $(`#${name}`).hidden = name !== step; });
    $$("#progress-list li").forEach((item) => {
      const itemStep = item.dataset.step;
      item.removeAttribute("aria-current");
      item.classList.toggle("complete", steps.indexOf(itemStep) < steps.indexOf(step));
      if (itemStep === step) item.setAttribute("aria-current", "step");
    });
    history.replaceState(null, "", `#${step}`);
    const heading = $(`#${step} h2`);
    document.title = `${heading.textContent} · UDST Schedule Generator`;
    if (!options || options.focus !== false) heading.focus();
    announce(`${heading.textContent}. Step ${steps.indexOf(step) + 1} of ${steps.length}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function invalidateResults() {
    state.results = [];
    state.selectedResultId = null;
  }

  function renderCourseFields() {
    const root = $("#course-fields");
    root.innerHTML = "";
    state.courses.forEach((course, index) => {
      const fragment = $("#course-row-template").content.cloneNode(true);
      const fieldset = $(".course-row", fragment);
      const legend = $("legend", fragment);
      const label = $("label", fragment);
      const input = $("input", fragment);
      const help = $(".help", fragment);
      const remove = $(".remove-course", fragment);
      const inputId = `course-code-${course.id}`;
      legend.textContent = `Course ${index + 1}`;
      label.htmlFor = inputId;
      input.id = inputId;
      input.value = course.code;
      input.dataset.courseId = course.id;
      help.id = `${inputId}-help`;
      input.setAttribute("aria-describedby", help.id);
      remove.dataset.courseId = course.id;
      remove.setAttribute("aria-label", `Remove course ${index + 1}${course.code ? `, ${course.code}` : ""}`);
      remove.hidden = state.courses.length === 1;
      fieldset.dataset.courseId = course.id;
      root.appendChild(fragment);
    });
    $("#term").value = state.term;
  }

  function validateCourses() {
    const messages = [];
    state.term = $("#term").value;
    $("#term").toggleAttribute("aria-invalid", !state.term);
    if (!state.term) messages.push("Choose an academic term.");
    const normalized = new Set();
    state.courses.forEach((course, index) => {
      const input = $(`#course-code-${course.id}`);
      course.code = input.value.trim();
      const key = course.code.replace(/\s+/g, " ").toLowerCase();
      let invalid = !course.code;
      if (!course.code) messages.push(`Enter a code or name for Course ${index + 1}.`);
      else if (normalized.has(key)) {
        invalid = true;
        messages.push(`${course.code} appears more than once.`);
      }
      normalized.add(key);
      input.toggleAttribute("aria-invalid", invalid);
    });
    showErrors("#courses-errors", messages);
    return !messages.length;
  }

  function renderUploads() {
    const root = $("#upload-list");
    root.innerHTML = state.courses.map((course, index) => {
      const files = course.files.length
        ? `<ul class="file-list">${course.files.map((file, fileIndex) => `<li class="file-item"><span><strong>${escapeHtml(file.name)}</strong> · ${formatBytes(file.size)}</span><span><a class="button button-secondary button-small" href="${escapeHtml(file.url)}" target="_blank" rel="noopener" aria-label="View ${escapeHtml(file.name)} in a new tab">View</a> <button class="button button-danger button-small remove-file" type="button" data-course-id="${course.id}" data-file-index="${fileIndex}" aria-label="Remove ${escapeHtml(file.name)} from ${escapeHtml(course.code)}">Remove</button></span></li>`).join("")}</ul>`
        : "";
      return `<fieldset class="course-upload">
        <legend class="sr-only">Screenshots for ${escapeHtml(course.code)}</legend>
        <div class="course-name"><small>Course ${index + 1}</small><strong>${escapeHtml(course.code)}</strong><span>${course.files.length ? `${course.files.length} reference file${course.files.length === 1 ? "" : "s"} attached` : "No files attached yet"}</span></div>
        <div class="upload-control">
          <label class="dropzone" for="files-${course.id}">
            <input id="files-${course.id}" class="file-input" type="file" accept="image/png,image/jpeg" multiple data-course-id="${course.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>
            <span><strong>Attach screenshots for ${escapeHtml(course.code)}</strong><span>PNG or JPG · up to 8 MB each · multiple files allowed</span></span>
          </label>${files}
        </div>
      </fieldset>`;
    }).join("");
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addFiles(courseId, fileList) {
    const course = state.courses.find((item) => item.id === courseId);
    if (!course) return;
    const rejected = [];
    Array.from(fileList).forEach((file) => {
      const supported = ["image/png", "image/jpeg"].includes(file.type) || /\.(png|jpe?g)$/i.test(file.name);
      const duplicate = course.files.some((existing) => existing.name === file.name && existing.size === file.size);
      if (!supported) rejected.push(`${file.name} is not a PNG or JPG.`);
      else if (file.size > 8 * 1024 * 1024) rejected.push(`${file.name} is larger than 8 MB.`);
      else if (duplicate) rejected.push(`${file.name} is already attached.`);
      else course.files.push({ file, name: file.name, size: file.size, url: URL.createObjectURL(file) });
    });
    renderUploads();
    showErrors("#screenshots-errors", rejected);
    if (course.files.length) announce(`${course.files.length} file${course.files.length === 1 ? "" : "s"} attached to ${course.code}.`);
  }

  function renderVerification() {
    const root = $("#verification-list");
    if (!state.courses.some((course) => course.id === activeVerificationCourseId)) activeVerificationCourseId = state.courses[0].id;
    const tabs = state.courses.map((course, index) => {
      const active = course.id === activeVerificationCourseId;
      return `<button id="course-tab-${course.id}" class="course-tab${active ? " active" : ""}" type="button" role="tab" aria-selected="${active}" aria-controls="course-panel-${course.id}" data-course-id="${course.id}"><span>Course ${index + 1}</span><strong>${escapeHtml(course.code)}</strong><small>${course.confirmed ? "Verified" : "Needs review"}</small></button>`;
    }).join("");
    const panels = state.courses.map((course, index) => {
      const nextCourse = state.courses[index + 1];
      const active = course.id === activeVerificationCourseId;
      return `<section id="course-panel-${course.id}" class="verification-course" role="tabpanel" aria-labelledby="course-tab-${course.id}" data-course-id="${course.id}" ${active ? "" : "hidden"}>
        <header><div><p class="course-position">Course ${index + 1} of ${state.courses.length}</p><h3>${escapeHtml(course.code)}</h3><p>${course.files.map((file) => escapeHtml(file.name)).join(" · ") || "No local reference attached"}</p></div><button class="button button-secondary button-small add-option" type="button" data-course-id="${course.id}">Add option</button></header>
        <div class="option-list">${course.options.map((option, optionIndex) => renderOption(course, option, optionIndex)).join("")}</div>
        <label class="confirm-row"><input class="course-confirm" type="checkbox" data-course-id="${course.id}" ${course.confirmed ? "checked" : ""}><span>I checked every option and meeting for ${escapeHtml(course.code)} against PeopleSoft.</span></label>
        ${nextCourse ? `<div class="course-next"><button class="button button-primary next-course" type="button" data-course-id="${nextCourse.id}">Continue to Course ${index + 2}: ${escapeHtml(nextCourse.code)}</button></div>` : ""}
      </section>`;
    }).join("");
    root.innerHTML = `<div class="course-switcher"><div class="course-switcher-heading"><strong>Courses to verify</strong><span>Choose each course and confirm its options.</span></div><div class="course-tabs" role="tablist" aria-label="Courses to verify">${tabs}</div></div>${panels}`;
  }

  function renderOption(course, option, optionIndex) {
    return `<fieldset class="option-card" data-option-id="${option.id}">
      <legend>Option ${optionIndex + 1}</legend>
      <div class="option-grid">
        ${fieldHtml("Option number", "text", option.number, course.id, option.id, "", "number", "Example: 1")}
        <div class="field"><label for="status-${option.id}">Registration status</label><select id="status-${option.id}" data-course-id="${course.id}" data-option-id="${option.id}" data-field="status"><option value="open" ${option.status === "open" ? "selected" : ""}>Open</option><option value="waitlist" ${option.status === "waitlist" ? "selected" : ""}>Wait List</option><option value="closed" ${option.status === "closed" ? "selected" : ""}>Closed · excluded</option></select></div>
        <button class="button button-danger button-small remove-option" type="button" data-course-id="${course.id}" data-option-id="${option.id}" ${course.options.length === 1 ? "disabled" : ""}>Remove option</button>
      </div>
      <div class="meetings">${option.meetings.map((meeting, meetingIndex) => renderMeeting(course, option, meeting, meetingIndex)).join("")}</div>
      <div class="option-actions"><span class="help">All meetings in this option are selected together.</span><button class="button button-secondary button-small add-meeting" type="button" data-course-id="${course.id}" data-option-id="${option.id}">Add meeting to option</button></div>
    </fieldset>`;
  }

  function fieldHtml(label, type, value, courseId, optionId, meetingId, field, placeholder) {
    const id = `${field}-${meetingId || optionId}`;
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}" ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ""} data-course-id="${courseId}" data-option-id="${optionId}" ${meetingId ? `data-meeting-id="${meetingId}"` : ""} data-field="${field}"></div>`;
  }

  function renderMeeting(course, option, meeting, meetingIndex) {
    const dayOptions = dayValues.map((value, index) => `<option value="${value}" ${meeting.day === value ? "selected" : ""}>${days[index]}</option>`).join("");
    return `<fieldset class="meeting-row" data-meeting-id="${meeting.id}"><legend class="sr-only">Meeting ${meetingIndex + 1}</legend>
      <div class="field"><label for="component-${meeting.id}">Component</label><select id="component-${meeting.id}" data-course-id="${course.id}" data-option-id="${option.id}" data-meeting-id="${meeting.id}" data-field="component"><option value="lecture" ${meeting.component === "lecture" ? "selected" : ""}>Lecture</option><option value="lab" ${meeting.component === "lab" ? "selected" : ""}>Lab</option><option value="tutorial" ${meeting.component === "tutorial" ? "selected" : ""}>Tutorial</option></select></div>
      ${fieldHtml("Class no.", "text", meeting.classNumber, course.id, option.id, meeting.id, "classNumber", "12345")}
      ${fieldHtml("Section", "text", meeting.section, course.id, option.id, meeting.id, "section", "L01")}
      <div class="field"><label for="day-${meeting.id}">Day</label><select id="day-${meeting.id}" data-course-id="${course.id}" data-option-id="${option.id}" data-meeting-id="${meeting.id}" data-field="day">${dayOptions}</select></div>
      ${fieldHtml("Starts", "time", meeting.start, course.id, option.id, meeting.id, "start")}
      ${fieldHtml("Ends", "time", meeting.end, course.id, option.id, meeting.id, "end")}
      ${fieldHtml("Room", "text", meeting.room, course.id, option.id, meeting.id, "room", "Optional")}
      <button class="button button-danger button-small remove-meeting" type="button" data-course-id="${course.id}" data-option-id="${option.id}" data-meeting-id="${meeting.id}" ${option.meetings.length === 1 ? "disabled" : ""}>Remove</button>
    </fieldset>`;
  }

  function findOption(courseId, optionId) {
    const course = state.courses.find((item) => item.id === courseId);
    return { course, option: course && course.options.find((item) => item.id === optionId) };
  }

  function updateVerificationField(target) {
    const { course, option } = findOption(target.dataset.courseId, target.dataset.optionId);
    if (!course || !option) return;
    if (target.dataset.meetingId) {
      const meeting = option.meetings.find((item) => item.id === target.dataset.meetingId);
      if (meeting) meeting[target.dataset.field] = target.value.trim();
    } else {
      option[target.dataset.field] = target.value.trim();
    }
    course.confirmed = false;
    const confirmation = $(`.course-confirm[data-course-id="${course.id}"]`);
    if (confirmation) confirmation.checked = false;
    invalidateResults();
    saveDraft();
  }

  function validateVerification() {
    const messages = [];
    state.courses.forEach((course) => {
      const eligible = course.options.filter((option) => option.status !== "closed");
      if (!eligible.length) messages.push(`${course.code} has no Open or Wait List option available for generation.`);
      const seenNumbers = new Set();
      course.options.forEach((option, optionIndex) => {
        const label = `${course.code}, option ${optionIndex + 1}`;
        if (!option.number) messages.push(`${label}: enter the PeopleSoft option number.`);
        else if (seenNumbers.has(option.number.toLowerCase())) messages.push(`${course.code}: option number ${option.number} appears more than once.`);
        seenNumbers.add(option.number.toLowerCase());
        option.meetings.forEach((meeting, meetingIndex) => {
          const meetingLabel = `${label}, meeting ${meetingIndex + 1}`;
          if (!meeting.classNumber) messages.push(`${meetingLabel}: enter a class number.`);
          if (!meeting.section) messages.push(`${meetingLabel}: enter a section.`);
          if (!meeting.start || !meeting.end) messages.push(`${meetingLabel}: enter both start and end times.`);
          else if (engine.toMinutes(meeting.start) >= engine.toMinutes(meeting.end)) messages.push(`${meetingLabel}: end time must be later than start time.`);
        });
        if (engine.optionHasInternalConflict(option)) messages.push(`${label}: meetings inside this bundle overlap.`);
      });
      if (!course.confirmed) messages.push(`Confirm that ${course.code} matches PeopleSoft.`);
    });
    showErrors("#verify-errors", messages);
    return !messages.length;
  }

  function generateResults() {
    state.results = engine.generateSchedules(state.courses, 50);
    state.selectedResultId = state.results[0]?.id || null;
    renderResults();
    saveDraft();
  }

  function resultReason(result, index) {
    const availability = result.hasWaitlist ? "Includes a Wait List option" : "Open options only";
    return `${availability} · ${result.campusDays} campus day${result.campusDays === 1 ? "" : "s"}${index === 0 ? " · Fewest waitlists and campus days" : ""}`;
  }

  function renderResults() {
    const noResults = $("#no-results");
    const content = $("#results-content");
    if (!state.results.length) {
      content.hidden = true;
      noResults.hidden = false;
      noResults.innerHTML = `<h3>No complete schedule is possible</h3><p>Every result must contain one complete option for every course. The verified options currently conflict.</p><ul><li>Return to verification and check the meeting times.</li><li>Add another Open or Wait List option for a course.</li><li>Do not split lecture, lab, or tutorial components from their option.</li></ul><button class="button button-primary" type="button" data-go="verify">Review verified options</button>`;
      $("#results-summary").textContent = "No partial or invalid schedules were returned.";
      return;
    }
    noResults.hidden = true;
    content.hidden = false;
    $("#results-summary").textContent = `${state.results.length}${state.results.length === 50 ? "+" : ""} complete conflict-free schedule${state.results.length === 1 ? "" : "s"} found from ${state.courses.length} verified courses.`;
    $("#schedule-options").innerHTML = state.results.slice(0, 9).map((result, index) => `<div class="schedule-choice"><input id="${result.id}" type="radio" name="schedule" value="${result.id}" ${result.id === state.selectedResultId ? "checked" : ""}><label for="${result.id}"><strong>Schedule ${index + 1}${index === 0 ? " · Best match" : ""}</strong><span>${escapeHtml(resultReason(result, index))}</span></label></div>`).join("");
    renderSelectedResult();
  }

  function selectedResult() {
    return state.results.find((result) => result.id === state.selectedResultId) || state.results[0];
  }

  function allMeetings(result) {
    return result.picks.flatMap((pick) => pick.option.meetings.map((meeting) => ({ ...meeting, courseCode: pick.courseCode, optionNumber: pick.option.number, status: pick.option.status }))).sort((first, second) => dayValues.indexOf(first.day) - dayValues.indexOf(second.day) || engine.toMinutes(first.start) - engine.toMinutes(second.start));
  }

  function renderSelectedResult() {
    const result = selectedResult();
    if (!result) return;
    const meetings = allMeetings(result);
    $("#week-board").innerHTML = dayValues.map((day, index) => {
      const events = meetings.filter((meeting) => meeting.day === day);
      return `<section class="day-column" aria-labelledby="day-${day}"><h4 id="day-${day}">${days[index]}</h4>${events.length ? `<ol class="day-events">${events.map((meeting) => `<li class="class-event"><strong>${escapeHtml(meeting.courseCode)} · ${escapeHtml(capitalize(meeting.component))}</strong><span>${formatTime(meeting.start)}–${formatTime(meeting.end)}</span><span>Section ${escapeHtml(meeting.section)} · Class ${escapeHtml(meeting.classNumber)}${meeting.room ? ` · ${escapeHtml(meeting.room)}` : ""}</span></li>`).join("")}</ol>` : `<p class="empty-day">No meetings</p>`}</section>`;
    }).join("");
    $("#agenda-body").innerHTML = meetings.map((meeting) => `<tr><td>${days[dayValues.indexOf(meeting.day)]}</td><td><bdi>${formatTime(meeting.start)}–${formatTime(meeting.end)}</bdi></td><td><bdi>${escapeHtml(meeting.courseCode)}</bdi><br><span class="help">Option ${escapeHtml(meeting.optionNumber)}</span></td><td>${escapeHtml(capitalize(meeting.component))}</td><td><bdi>${escapeHtml(meeting.section)}</bdi></td><td><bdi>${escapeHtml(meeting.classNumber)}</bdi></td><td>${escapeHtml(meeting.room || "Not listed")}</td><td>${meeting.status === "waitlist" ? "Wait List" : "Open"}</td></tr>`).join("");
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  }

  function formatTime(value) {
    const minutes = engine.toMinutes(value);
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  }

  function copyClassNumbers() {
    const result = selectedResult();
    if (!result) return;
    const text = result.picks.map((pick) => `${pick.courseCode}: ${pick.option.meetings.map((meeting) => meeting.classNumber).join(", ")}`).join("\n");
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
    announce("Class numbers copied. Recheck availability in PeopleSoft before registering.");
    $("#copy-classes").textContent = "Copied class numbers";
    window.setTimeout(() => { $("#copy-classes").textContent = "Copy class numbers"; }, 2000);
  }

  $("#course-fields").addEventListener("input", (event) => {
    const course = state.courses.find((item) => item.id === event.target.dataset.courseId);
    if (!course) return;
    course.code = event.target.value;
    course.confirmed = false;
    invalidateResults();
    saveDraft();
  });

  $("#term").addEventListener("change", (event) => { state.term = event.target.value; invalidateResults(); saveDraft(); });

  $("#add-course").addEventListener("click", () => {
    state.courses.push(newCourse());
    renderCourseFields();
    const input = $(`#course-code-${state.courses.at(-1).id}`);
    input.focus();
    announce(`Course ${state.courses.length} added.`);
  });

  $("#course-fields").addEventListener("click", (event) => {
    const button = event.target.closest(".remove-course");
    if (!button || state.courses.length === 1) return;
    const course = state.courses.find((item) => item.id === button.dataset.courseId);
    const hasWork = course.files.length || course.options.some((option) => option.number || option.meetings.some((meeting) => meeting.classNumber));
    if (hasWork && !window.confirm(`Remove ${course.code || "this course"} and all of its entered details?`)) return;
    state.courses = state.courses.filter((item) => item.id !== course.id);
    invalidateResults();
    renderCourseFields();
    saveDraft();
    announce("Course removed.");
  });

  $("#courses-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateCourses()) return;
    renderUploads();
    saveDraft();
    goToStep("screenshots");
  });

  $("#upload-list").addEventListener("change", (event) => {
    if (event.target.matches(".file-input")) addFiles(event.target.dataset.courseId, event.target.files);
  });

  $("#upload-list").addEventListener("click", (event) => {
    const button = event.target.closest(".remove-file");
    if (!button) return;
    const course = state.courses.find((item) => item.id === button.dataset.courseId);
    const [removed] = course.files.splice(Number(button.dataset.fileIndex), 1);
    if (removed?.url) URL.revokeObjectURL(removed.url);
    renderUploads();
    announce(`File removed from ${course.code}.`);
  });

  $("#screenshots-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const missing = state.courses.filter((course) => !course.files.length);
    const messages = missing.map((course) => `Attach at least one screenshot to ${course.code}.`);
    showErrors("#screenshots-errors", messages);
    if (messages.length) return;
    renderVerification();
    goToStep("verify");
  });

  $("#verification-list").addEventListener("input", (event) => {
    if (event.target.matches("input[data-field], select[data-field]")) updateVerificationField(event.target);
    if (event.target.matches(".course-confirm")) {
      const course = state.courses.find((item) => item.id === event.target.dataset.courseId);
      course.confirmed = event.target.checked;
      invalidateResults();
      saveDraft();
    }
  });

  $("#verification-list").addEventListener("change", (event) => {
    if (event.target.matches("select[data-field]")) updateVerificationField(event.target);
  });

  $("#verification-list").addEventListener("click", (event) => {
    const tab = event.target.closest(".course-tab, .next-course");
    if (tab) {
      activeVerificationCourseId = tab.dataset.courseId;
      renderVerification();
      const activeTab = $(`#course-tab-${activeVerificationCourseId}`);
      activeTab.focus();
      announce(`${activeTab.querySelector("strong").textContent} verification form shown.`);
      return;
    }
    const action = event.target.closest("button");
    if (!action) return;
    const { course, option } = findOption(action.dataset.courseId, action.dataset.optionId);
    if (action.matches(".add-option")) course.options.push(newOption());
    else if (action.matches(".remove-option") && course.options.length > 1) course.options = course.options.filter((item) => item.id !== option.id);
    else if (action.matches(".add-meeting")) option.meetings.push(newMeeting());
    else if (action.matches(".remove-meeting") && option.meetings.length > 1) option.meetings = option.meetings.filter((item) => item.id !== action.dataset.meetingId);
    else return;
    course.confirmed = false;
    invalidateResults();
    renderVerification();
    saveDraft();
    announce("Verification form updated. Reconfirm this course after checking its details.");
  });

  $("#verify-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateVerification()) return;
    generateResults();
    goToStep("results");
  });

  $("#schedule-options").addEventListener("change", (event) => {
    if (event.target.name !== "schedule") return;
    state.selectedResultId = event.target.value;
    renderSelectedResult();
    saveDraft();
    announce(`${$("label", event.target.parentElement).querySelector("strong").textContent} selected.`);
  });

  document.addEventListener("click", (event) => {
    const navigation = event.target.closest("[data-go]");
    if (navigation) {
      const step = navigation.dataset.go;
      if (step === "screenshots") renderUploads();
      if (step === "verify") renderVerification();
      goToStep(step);
    }
  });

  $("#copy-classes").addEventListener("click", copyClassNumbers);
  $("#print-schedule").addEventListener("click", () => window.print());
  $("#clear-plan").addEventListener("click", () => {
    if (!window.confirm("Clear every course, option, and schedule from this browser session?")) return;
    state.courses.forEach((course) => course.files.forEach((file) => { if (file.url) URL.revokeObjectURL(file.url); }));
    sessionStorage.removeItem("udst-schedule-draft");
    state = initialState();
    renderCourseFields();
    goToStep("courses");
    announce("Plan cleared.");
  });

  renderCourseFields();
  goToStep("courses", { focus: false });
  if (sessionStorage.getItem("udst-schedule-draft")) announce("Your course draft was restored. Screenshots must be attached again for privacy.");
  window.addEventListener("beforeunload", () => state.courses.forEach((course) => course.files.forEach((file) => { if (file.url) URL.revokeObjectURL(file.url); })));
})();
