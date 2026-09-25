import test from "node:test";
import assert from "node:assert/strict";
import { daypartGreeting } from "../dist/home-content.js";
import { localDateISO, remapTextComment, scheduleProgress, screenplayKinds } from "../dist/tool-ui.js";

test("screenplay shortcuts follow the specified nine-element order", () => {
  assert.deepEqual(screenplayKinds, ["Act", "Scene Heading", "Action", "Character", "Dialogue", "Parenthetical", "Transition", "Shot", "Text"]);
});

test("new schedule dates follow the user's local calendar day", () => {
  assert.equal(localDateISO(new Date(2026, 8, 25, 0, 1)), "2026-09-25");
});

test("greeting changes at each local daypart boundary", () => {
  assert.equal(daypartGreeting(4), "Good night");
  assert.equal(daypartGreeting(5), "Good morning");
  assert.equal(daypartGreeting(12), "Good afternoon");
  assert.equal(daypartGreeting(17), "Good evening");
  assert.equal(daypartGreeting(22), "Good night");
});

test("script comment follows inserted text and orphans when its quote is removed", () => {
  const comment = { id: "c", from: 6, to: 11, quote: "world", body: "Review", orphaned: false, resolved: false };
  assert.deepEqual(remapTextComment(comment, "hello world", "hello brave world"), { ...comment, from: 12, to: 17 });
  assert.equal(remapTextComment(comment, "hello world", "hello ").orphaned, true);
  assert.deepEqual(remapTextComment(comment, "hello world", "hello world!"), comment);
  assert.deepEqual(remapTextComment(comment, "hello world", "hello wor-l-d"), { ...comment, to: 13, quote: "wor-l-d" });
});

test("schedule progress groups entries by Day before calculating completed shoot days", () => {
  const record = (id, day, status) => ({ id, fields: { day, status } });
  assert.deepEqual(scheduleProgress([
    record("one-a", "1", "Completed"),
    record("one-b", "1", "Completed"),
    record("two", "2", "In Progress"),
    record("three", "3", "Not Started"),
  ]), { total: 3, completed: 1, remaining: 2, percentage: 33, inProgress: 1 });
});
