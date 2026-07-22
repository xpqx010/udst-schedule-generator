"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const scheduler = require("../assets/scheduler.js");

function meeting(day, start, end) {
  return { day, start, end };
}

test("detects overlapping meetings on the same day", () => {
  assert.equal(scheduler.meetingsConflict(meeting("sun", "09:00", "10:30"), meeting("sun", "10:00", "11:00")), true);
});

test("allows back-to-back meetings", () => {
  assert.equal(scheduler.meetingsConflict(meeting("sun", "09:00", "10:00"), meeting("sun", "10:00", "11:00")), false);
});

test("preserves one complete option per course and excludes closed options", () => {
  const courses = [
    { id: "a", code: "COURSE A", options: [
      { id: "a-open", status: "open", meetings: [meeting("sun", "09:00", "10:00")] },
      { id: "a-closed", status: "closed", meetings: [meeting("mon", "09:00", "10:00")] }
    ] },
    { id: "b", code: "COURSE B", options: [
      { id: "b-open", status: "open", meetings: [meeting("sun", "10:00", "11:00")] }
    ] }
  ];
  const results = scheduler.generateSchedules(courses);
  assert.equal(results.length, 1);
  assert.equal(results[0].picks.length, 2);
  assert.equal(results[0].picks.some((pick) => pick.option.status === "closed"), false);
});

test("returns no partial schedule when every complete combination conflicts", () => {
  const courses = [
    { id: "a", code: "COURSE A", options: [{ id: "a1", status: "open", meetings: [meeting("sun", "09:00", "11:00")] }] },
    { id: "b", code: "COURSE B", options: [{ id: "b1", status: "open", meetings: [meeting("sun", "10:00", "12:00")] }] }
  ];
  assert.deepEqual(scheduler.generateSchedules(courses), []);
});
