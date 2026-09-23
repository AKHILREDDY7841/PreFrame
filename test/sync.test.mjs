import test from "node:test";
import assert from "node:assert/strict";
import { SyncQueue } from "../dist/sync.js";
import { sampleProject } from "../dist/domain.js";

test("sync queue coalesces writes and marks conflict without overwrite", async () => {
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
  Object.defineProperty(globalThis, "crypto", { value: { randomUUID: () => "op" }, configurable: true });
  const states = [];
  const remote = { saveProject: async () => ({ kind: "conflict", latest: { value: sampleProject, revision: 2 } }) };
  const queue = new SyncQueue(remote, (state) => states.push(state));
  queue.enqueue({ ...sampleProject, title: "first" }, 1);
  queue.enqueue({ ...sampleProject, title: "second" }, 1);
  await queue.flush();
  assert.equal(queue.status(), "conflict");
  assert.deepEqual(states, ["saved-locally", "saved-locally", "syncing", "conflict"]);
  assert.equal(queue.retryDelay(99), 30_000);
});
