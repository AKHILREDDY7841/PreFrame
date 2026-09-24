const DB_NAME = "preframe-pending-v1";
const STORE = "project-titles";
function db() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function read(key) {
    const database = await db();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE).objectStore(STORE).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function write(value) {
    const database = await db();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE, "readwrite").objectStore(STORE).put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
async function removeIfGeneration(key, generation) {
    const database = await db();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const request = store.get(key);
        let removed = false;
        request.onsuccess = () => { if (request.result?.generation === generation) {
            store.delete(key);
            removed = true;
        } };
        tx.oncomplete = () => resolve(removed);
        tx.onerror = () => reject(tx.error);
    });
}
/** Keeps title edits durable before attempting a compare-and-swap cloud write. */
export class DurableProjectSync {
    userId;
    projectId;
    remote;
    notify;
    store;
    running = false;
    timer;
    current;
    state = "synced";
    staging = Promise.resolve();
    constructor(userId, projectId, remote, notify, store = { read, write, removeIfGeneration }) {
        this.userId = userId;
        this.projectId = projectId;
        this.remote = remote;
        this.notify = notify;
        this.store = store;
    }
    get key() { return `${this.userId}:${this.projectId}`; }
    status() { return this.state; }
    set(state, detail, project) { this.state = state; this.notify(state, detail, project); }
    async restore() {
        this.current = await this.store.read(this.key);
        if (this.current) {
            this.set("saved-locally");
            this.schedule(0);
        }
        return this.current?.project;
    }
    stage(project, baseRevision) {
        this.staging = this.staging.catch(() => { }).then(() => this.stageNow(project, baseRevision));
        return this.staging;
    }
    async stageNow(project, baseRevision) {
        const existing = this.current || await this.store.read(this.key);
        const pending = { key: this.key, project,
            baseRevision: existing?.baseRevision ?? baseRevision,
            generation: (existing?.generation ?? 0) + 1, attempts: existing?.attempts ?? 0 };
        await this.store.write(pending);
        this.current = pending;
        this.set("saved-locally");
        this.schedule(650);
    }
    schedule(delay) { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), delay); }
    async flush() {
        await this.staging;
        if (this.running || !navigator.onLine)
            return;
        const pending = this.current || await this.store.read(this.key);
        if (!pending)
            return;
        this.running = true;
        this.set("syncing");
        try {
            const result = await this.remote.saveProject(pending.project, pending.baseRevision);
            if (result.kind === "ok") {
                await this.staging;
                const removed = await this.store.removeIfGeneration(this.key, pending.generation);
                if (removed) {
                    this.current = undefined;
                    this.set("synced", undefined, result.value.value);
                }
                else {
                    const latest = this.current || await this.store.read(this.key);
                    if (!latest)
                        return;
                    const updated = { ...latest, baseRevision: result.value.revision, attempts: 0 };
                    await this.store.write(updated);
                    this.current = updated;
                    this.set("saved-locally", undefined, result.value.value);
                    this.schedule(100);
                }
            }
            else if (result.kind === "conflict")
                this.set("conflict", "Another editor changed this project. Your local title is preserved for review.", result.latest.value);
            else
                this.fail(result.message);
        }
        catch (error) {
            this.fail(error instanceof Error ? error.message : "Cloud write failed");
        }
        finally {
            this.running = false;
        }
    }
    fail(message) {
        const pending = this.current;
        if (pending) {
            pending.attempts += 1;
            this.store.write(pending).catch(() => { });
            this.schedule(Math.min(30_000, 500 * 2 ** Math.min(pending.attempts, 6)));
        }
        this.set("sync-failed", message);
    }
    dispose() { clearTimeout(this.timer); }
}
