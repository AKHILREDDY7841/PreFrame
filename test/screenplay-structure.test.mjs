import assert from "node:assert/strict";
import test from "node:test";
import { characterSuggestions, cycleScreenplayKind, deriveScreenplayScenes, nextScreenplayKind, sceneHeadingSuggestions, splitScreenplayText } from "../dist/tool-ui.js";

const block = (id, kind, text, order) => ({ id, title: text, fields: { kind, text, order }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });

test("screenplay Enter transitions follow semantic element types", () => {
  assert.equal(nextScreenplayKind("Scene Heading"), "Action");
  assert.equal(nextScreenplayKind("Character"), "Dialogue");
  assert.equal(nextScreenplayKind("Parenthetical"), "Dialogue");
  assert.equal(nextScreenplayKind("Dialogue"), "Character");
  assert.equal(nextScreenplayKind("Character", true), "Scene Heading");
  assert.equal(nextScreenplayKind("Action", true), "Character");
  assert.equal(nextScreenplayKind("Transition"), "Scene Heading");
  assert.equal(nextScreenplayKind("Text"), "Text");
});

test("splitting at start, middle, end, or over a selection preserves the intended text", () => {
  assert.deepEqual(splitScreenplayText("Akhil walks slowly", 0), ["", "Akhil walks slowly"]);
  assert.deepEqual(splitScreenplayText("Akhil walks slowly", 11), ["Akhil walks", " slowly"]);
  assert.deepEqual(splitScreenplayText("Akhil walks slowly", 18), ["Akhil walks slowly", ""]);
  assert.deepEqual(splitScreenplayText("Akhil walks slowly", 5, 11), ["Akhil", " slowly"]);
});

test("Tab cycles types without inserting whitespace", () => {
  assert.equal(cycleScreenplayKind("Scene Heading"), "Action");
  assert.equal(cycleScreenplayKind("Action", true), "Scene Heading");
});

test("scene navigator derives stable IDs and display order from headings", () => {
  const scenes = deriveScreenplayScenes([block("a", "Scene Heading", "INT. LIBRARY - DAY", "000001"), block("b", "Action", "Sana waits.", "000002"), block("c", "Scene Heading", "EXT. LAWN - NIGHT", "000003")]);
  assert.deepEqual(scenes.map(scene => [scene.id, scene.number, scene.endBlockId]), [["a", 1, "b"], ["c", 2, "c"]]);
});

test("character and scene assists are case-insensitive and de-duplicate", () => {
  const records = [block("a", "Character", "Sana", "000001"), block("b", "Character", "SANA", "000002"), block("c", "Scene Heading", "INT. LIBRARY - DAY", "000003")];
  assert.deepEqual(characterSuggestions(records, "sa"), ["SANA"]);
  assert.deepEqual(sceneHeadingSuggestions(records, "int").slice(0, 2), ["INT.", "INT./EXT."]);
});
