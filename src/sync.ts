import type { Project, SyncState } from "./domain.js";
import type { ProjectRepository } from "./repository.js";
export type PendingOperation = { id: string; project: Project; expectedRevision: number; attempts: number };
export class SyncQueue {
  private queue: PendingOperation[] = []; private state: SyncState = "saved-locally";
  constructor(private remote: ProjectRepository | null, private notify: (state: SyncState) => void) {}
  status() { return this.state; }
  enqueue(project: Project, expectedRevision: number) { this.queue = [...this.queue.filter((operation) => operation.project.id !== project.id), { id: crypto.randomUUID(), project, expectedRevision, attempts: 0 }]; this.set("saved-locally"); }
  async flush() { if (!this.remote || !navigator.onLine || !this.queue.length) return; this.set("syncing"); const operation = this.queue[0]; const result = await this.remote.saveProject(operation.project, operation.expectedRevision); if (result.kind === "ok") { this.queue.shift(); this.set(this.queue.length ? "saved-locally" : "synced"); return; } if (result.kind === "conflict") { this.set("conflict"); return; } operation.attempts += 1; this.set("sync-failed"); }
  retryDelay(attempts: number) { return Math.min(30_000, 500 * 2 ** Math.min(attempts, 6)); }
  private set(state: SyncState) { this.state = state; this.notify(state); }
}
