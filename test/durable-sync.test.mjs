import test from "node:test";
import assert from "node:assert/strict";
import { DurableProjectSync } from "../dist/durable-sync.js";
import { sampleProject } from "../dist/domain.js";

function memoryStore() {
  const entries = new Map();
  return {
    read: async key => entries.get(key),
    write: async value => { entries.set(value.key, structuredClone(value)); },
    removeIfGeneration: async (key, generation) => {
      if (entries.get(key)?.generation !== generation) return false;
      entries.delete(key); return true;
    },
    entries,
  };
}

test("offline title edits survive reload and sync once with the original revision", async () => {
  let online = false;
  Object.defineProperty(globalThis, "navigator", { value: { get onLine() { return online; } }, configurable: true });
  const store = memoryStore();
  const calls = [];
  const remote = { saveProject: async (project, revision) => {
    calls.push([project.title, revision]);
    return { kind: "ok", value: { value: { ...project, revision: revision + 1 }, revision: revision + 1 } };
  } };
  const first = new DurableProjectSync("user", sampleProject.id, remote, () => {}, store);
  await Promise.all([
    first.stage({ ...sampleProject, title: "First edit" }, 1),
    first.stage({ ...sampleProject, title: "Final offline edit" }, 1),
  ]);
  await first.flush();
  assert.equal(calls.length, 0);
  first.dispose();
  const states = [];
  const reloaded = new DurableProjectSync("user", sampleProject.id, remote, state => states.push(state), store);
  const pending = await reloaded.restore();
  assert.equal(pending.title, "Final offline edit");
  online = true;
  await reloaded.flush();
  assert.deepEqual(calls, [["Final offline edit", 1]]);
  assert.equal(store.entries.size, 0);
  assert.equal(states.at(-1), "synced");
  reloaded.dispose();
});

test("a conflicting remote revision preserves the local edit for review", async () => {
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
  const store = memoryStore();
  const states = [];
  const remote = { saveProject: async () => ({ kind: "conflict", latest: { value: sampleProject, revision: 2 } }) };
  const sync = new DurableProjectSync("user", sampleProject.id, remote, state => states.push(state), store);
  await sync.stage({ ...sampleProject, title: "My change" }, 1);
  await sync.flush();
  assert.equal(sync.status(), "conflict");
  assert.equal((await store.read(`user:${sampleProject.id}`)).project.title, "My change");
  assert.equal(states.at(-1), "conflict");
  sync.dispose();
});
