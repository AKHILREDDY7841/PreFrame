import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.window = {};
const { previewBackup } = await import("../dist/backup.js");
const tables = ["screenplay_drafts", "screenplay_blocks", "scenes", "screenplay_comments", "notes", "characters", "actors", "locations", "media", "shots", "storyboard_frames", "shoot_days", "schedule_entries", "call_sheet_versions", "character_actors"];
async function archive() {
  const project = { id: "11111111-1111-4111-8111-111111111111", title: "Rain at the Edit" };
  const content = { projects: [project], ...Object.fromEntries(tables.map(table => [table, []])) };
  const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(content)));
  const sha = Buffer.from(digest).toString("hex");
  return { manifest: { format: "preframe-project", version: 1, exportedAt: new Date().toISOString(), projectId: project.id, contentSha256: sha, warnings: ["Unsynced edits excluded"] }, content, files: [] };
}
test("valid archive previews without creating a project", async () => {
  const result = await previewBackup(JSON.stringify(await archive()));
  assert.equal(result.title, "Rain at the Edit");
  assert.equal(result.records.projects, 1);
  assert.equal(result.files, 0);
});
test("corrupted structured content is rejected before import", async () => {
  const value = await archive();
  value.content.projects[0].title = "Tampered";
  await assert.rejects(previewBackup(JSON.stringify(value)), /checksum/);
});
test("a validly checksummed archive cannot mix records from another project", async () => {
  const value = await archive();
  value.content.notes.push({ id: "note", project_id: "22222222-2222-4222-8222-222222222222", title: "Other project" });
  const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value.content)));
  value.manifest.contentSha256 = Buffer.from(digest).toString("hex");
  await assert.rejects(previewBackup(JSON.stringify(value)), /Cross-project/);
});
