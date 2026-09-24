import test from "node:test";
import assert from "node:assert/strict";
import { daypartGreeting } from "../dist/home-content.js";
import { remapTextComment } from "../dist/tool-ui.js";

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
});
