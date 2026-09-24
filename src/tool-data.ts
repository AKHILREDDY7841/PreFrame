export type ToolName = "screenplay" | "notes" | "shots" | "storyboards" | "schedule" | "locations" | "call-sheets";
export type ToolRecord = { id: string; title: string; fields: Record<string, string>; createdAt: string; updatedAt: string };

const DB = "preframe-tools-v1";
const STORE = "records";
type Stored = ToolRecord & { key: string; scope: string; tool: ToolName };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "key" });
      store.createIndex("scope", "scope");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return database().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

const scope = (ownerId: string, projectId: string, tool: ToolName) => `${ownerId}:${projectId}:${tool}`;
export async function toolRecords(ownerId: string, projectId: string, tool: ToolName): Promise<ToolRecord[]> {
  const records = await transaction("readonly", store => store.index("scope").getAll(scope(ownerId, projectId, tool)));
  return (records as Stored[]).map(({ id, title, fields, createdAt, updatedAt }) => ({ id, title, fields, createdAt, updatedAt }));
}
export async function saveToolRecord(ownerId: string, projectId: string, tool: ToolName, record: ToolRecord, expectedUpdatedAt?: string): Promise<void> {
  const item: Stored = { ...record, key: `${scope(ownerId, projectId, tool)}:${record.id}`, scope: scope(ownerId, projectId, tool), tool };
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.get(item.key);
    request.onsuccess = () => {
      const current = request.result as Stored | undefined;
      if (expectedUpdatedAt !== undefined && current?.updatedAt !== expectedUpdatedAt) { tx.abort(); return; }
      store.put(item);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(new Error(expectedUpdatedAt !== undefined ? "This item changed in another tab. Reload before editing it again." : "Local save was interrupted")); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function deleteToolRecord(ownerId: string, projectId: string, tool: ToolName, id: string): Promise<void> {
  await transaction("readwrite", store => store.delete(`${scope(ownerId, projectId, tool)}:${id}`));
}
export function newToolRecord(title: string, fields: Record<string, string> = {}): ToolRecord {
  const timestamp = new Date().toISOString();
  return { id: crypto.randomUUID(), title, fields, createdAt: timestamp, updatedAt: timestamp };
}
const tools: ToolName[] = ["screenplay", "notes", "shots", "storyboards", "schedule", "locations", "call-sheets"];
export async function exportToolData(ownerId: string, projectId: string): Promise<string> {
  const records = Object.fromEntries(await Promise.all(tools.map(async tool => [tool, await toolRecords(ownerId, projectId, tool)])));
  return JSON.stringify({ format: "preframe-local-tools-v1", projectId, exportedAt: new Date().toISOString(), records }, null, 2);
}
export async function restoreToolData(ownerId: string, projectId: string, source: string): Promise<number> {
  if (source.length > 40_000_000) throw new Error("Backup exceeds the 40 MB import limit");
  const backup = JSON.parse(source) as { format?: string; projectId?: string; records?: Record<string, unknown> };
  if (backup.format !== "preframe-local-tools-v1" || backup.projectId !== projectId || !backup.records || typeof backup.records !== "object") throw new Error("This is not a local tool backup for this project");
  let count = 0;
  for (const tool of tools) {
    const rows = backup.records[tool];
    if (!Array.isArray(rows) || rows.length > 10_000) throw new Error(`Invalid ${tool} records`);
    for (const row of rows) {
      if (!row || typeof row !== "object" || typeof row.id !== "string" || typeof row.title !== "string" || !row.fields || typeof row.fields !== "object" || Object.values(row.fields).some(value => typeof value !== "string")) throw new Error(`Invalid ${tool} record`);
    }
  }
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const tool of tools) for (const row of backup.records![tool] as ToolRecord[]) {
      store.put({ ...row, key: `${scope(ownerId, projectId, tool)}:${row.id}`, scope: scope(ownerId, projectId, tool), tool });
      count++;
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(new Error("Restore was cancelled; no records were changed")); };
  });
  return count;
}
