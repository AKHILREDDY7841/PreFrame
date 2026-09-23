import test from "node:test";
import assert from "node:assert/strict";
import { parseRoute } from "../dist/routes.js";
import { isImmutableSceneId, sampleProject } from "../dist/domain.js";

test("recognizes each supported route layer", () => {
  assert.equal(parseRoute("/").page, "landing");
  assert.equal(parseRoute("/auth").page, "auth");
  assert.equal(parseRoute("/app").page, "home");
  assert.deepEqual(parseRoute(`/app/projects/${sampleProject.id}/shots`), { page: "workspace", projectId: sampleProject.id, tool: "shots" });
  assert.equal(parseRoute("/unknown").page, "not-found");
});
test("scene identity is independent from display number", () => {
  const before = { id: "scene-immutable", projectId: sampleProject.id, heading: "INT. ROOM", displayNumber: 1 };
  assert.equal(isImmutableSceneId(before, { ...before, heading: "EXT. ROAD", displayNumber: 5 }), true);
});
