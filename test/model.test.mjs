import test from "node:test";
import assert from "node:assert/strict";
import { remapAnchor } from "../dist/model.js";
test("insertion before selected text preserves the comment target", () => {
  const oldText = "Before target after";
  const from = oldText.indexOf("target"), to = from + 6;
  const inserted = "new "; const result = remapAnchor({ from, to, quote: "target", orphaned: false }, { map: (pos) => pos + inserted.length }, (a, b) => ("Before " + inserted + "target after").slice(a, b));
  assert.equal(result.orphaned, false); assert.equal(result.from, from + inserted.length);
});
test("deleting selected text orphans rather than silently retargeting", () => {
  const result = remapAnchor({ from: 7, to: 13, quote: "target", orphaned: false }, { map: () => 7 }, () => "");
  assert.equal(result.orphaned, true);
});
