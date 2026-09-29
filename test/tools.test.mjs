import test from "node:test";
import assert from "node:assert/strict";
import { daypartGreeting } from "../dist/home-content.js";
import { localDateISO, remapTextComment, scheduleProgress, screenplayKinds, toolWorkspace } from "../dist/tool-ui.js";
import { studioDocument } from "../dist/studio-documents.js";
import { classifyScreenplayLines } from "../dist/script-import.js";
import { landingDetails } from "../dist/landing-content.js";

test("Premium pricing shows one monthly and one yearly rate without expired offers", () => {
  const pricing = landingDetails("/auth");
  assert.match(pricing, /₹49\s*<small>\/ month<\/small>/);
  assert.match(pricing, /₹499\s*<small>\/ year<\/small>/);
  assert.doesNotMatch(pricing, /₹149|₹199|₹999|₹1,199|₹1,499|launch-period offer/i);
  assert.match(pricing, /Premium checkout is not available yet/);
});

test("screenplay shortcuts follow the specified nine-element order", () => {
  assert.deepEqual(screenplayKinds, ["Act", "Scene Heading", "Action", "Character", "Dialogue", "Parenthetical", "Transition", "Shot", "Text"]);
});

test("document properties and screenplay Add element control are absent", () => {
  const record = { id: "note", title: "Untitled document", fields: { body: "Draft", folder: "Old folder", tags: "Old tag" }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
  const document = studioDocument("notes", record, "Project");
  assert.doesNotMatch(document, /name="(?:folder|tags)"/);
  assert.match(document, /name="body"/);
  assert.match(document, /<div class="studio-note-body">/);
  assert.doesNotMatch(document, /<label class="studio-note-body">/);
  const workspace = toolWorkspace({ id: "project", title: "Project" }, "screenplay", path => path);
  assert.doesNotMatch(workspace, /id="tool-add"/);
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

test("PDF screenplay lines become editable screenplay element types", () => {
  assert.deepEqual(classifyScreenplayLines([
    "1", "1 EXT. COLLEGE ENTRANCE - DAY", "Students enter through the gates.", "              SIDDHARTH", "        (quietly)", "        I should get the shot.", "CUT TO:"
  ]), [
    { kind: "Scene Heading", text: "1 EXT. COLLEGE ENTRANCE - DAY" },
    { kind: "Action", text: "Students enter through the gates." },
    { kind: "Character", text: "SIDDHARTH" },
    { kind: "Parenthetical", text: "(quietly)" },
    { kind: "Dialogue", text: "I should get the shot." },
    { kind: "Transition", text: "CUT TO:" }
  ]);
});
