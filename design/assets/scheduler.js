(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ScheduleEngine = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function toMinutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return NaN;
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function meetingsConflict(first, second) {
    if (first.day !== second.day) return false;
    const firstStart = toMinutes(first.start);
    const firstEnd = toMinutes(first.end);
    const secondStart = toMinutes(second.start);
    const secondEnd = toMinutes(second.end);
    return firstStart < secondEnd && secondStart < firstEnd;
  }

  function optionsConflict(first, second) {
    return first.meetings.some((meeting) => second.meetings.some((other) => meetingsConflict(meeting, other)));
  }

  function optionHasInternalConflict(option) {
    return option.meetings.some((meeting, index) => option.meetings.slice(index + 1).some((other) => meetingsConflict(meeting, other)));
  }

  function generateSchedules(courses, limit) {
    const maximum = limit || 50;
    const prepared = courses.map((course) => ({
      id: course.id,
      code: course.code,
      options: course.options.filter((option) => option.status !== "closed")
    })).sort((first, second) => first.options.length - second.options.length);

    if (prepared.some((course) => course.options.length === 0)) return [];

    const results = [];
    function visit(courseIndex, selections) {
      if (results.length >= maximum) return;
      if (courseIndex === prepared.length) {
        const picks = selections.slice().sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        const days = new Set(picks.flatMap((pick) => pick.option.meetings.map((meeting) => meeting.day)));
        results.push({
          id: "schedule-" + (results.length + 1),
          picks,
          campusDays: days.size,
          hasWaitlist: picks.some((pick) => pick.option.status === "waitlist")
        });
        return;
      }

      const course = prepared[courseIndex];
      course.options.forEach((option) => {
        const conflicts = selections.some((selection) => optionsConflict(selection.option, option));
        if (!conflicts) visit(courseIndex + 1, selections.concat({ courseId: course.id, courseCode: course.code, option }));
      });
    }

    visit(0, []);
    return results.sort((first, second) => Number(first.hasWaitlist) - Number(second.hasWaitlist) || first.campusDays - second.campusDays || first.id.localeCompare(second.id));
  }

  return { toMinutes, meetingsConflict, optionsConflict, optionHasInternalConflict, generateSchedules };
});
