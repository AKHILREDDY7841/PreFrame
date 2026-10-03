import { withTimeout, retryTransient } from "./request-state.js";
export type ToolName = "screenplay" | "notes" | "shots" | "storyboards" | "schedule" | "locations" | "call-sheets";
export type ToolRecord = { id: string; title: string; fields: Record<string, string>; createdAt: string; updatedAt: string; revision?: number; pendingSync?: boolean };

const DB = "preframe-tools-v1";
const STORE = "records";
type Stored = ToolRecord & { key: string; scope: string; tool: ToolName };
type CloudRow = { id: string; title: string; fields: Record<string, string>; created_at: string; updated_at: string; revision: number };

// Preview and signed-out sessions remain local. Signed-in workspaces use the
// project-scoped cloud table and keep a local copy for offline recovery.
async function cloudFor(ownerId: string) {
  if (ownerId === "local-demo-owner" || ownerId === "anonymous") return null;
  const { supabase } = await import("./cloud.js");
  // Session is already checked by the workspace gate; RLS verifies each write.
  // Avoid an extra network/auth-lock request on every autosave.
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (session?.user.id !== ownerId) throw new Error('Sign in again to sync your locally saved changes.');
  return supabase;
}
const fromCloud = (row: CloudRow): ToolRecord => ({ id: row.id, title: row.title, fields: row.fields || {}, createdAt: row.created_at, updatedAt: row.updated_at, revision: row.revision });

async function signedToolImages(ownerId: string, records: ToolRecord[]) {
  const supabase = await cloudFor(ownerId);
  if (!supabase) return records;
  return Promise.all(records.map(async record => {
    const path = record.fields.imagePath;
    if (!path) return record;
    const { data } = await supabase.storage.from("project-media").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ? { ...record, fields: { ...record.fields, image: data.signedUrl } } : record;
  }));
}

export async function storeToolImage(ownerId: string, projectId: string, tool: ToolName, recordId: string, imageDataUrl: string) {
  const supabase = await cloudFor(ownerId);
  if (!supabase) return { image: imageDataUrl, imagePath: "" };
  const image = await fetch(imageDataUrl).then(response => response.blob());
  const path = `${projectId}/tool-media/${tool}/${recordId}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("project-media").upload(path, image, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage.from("project-media").createSignedUrl(path, 60 * 60);
  if (signError || !data?.signedUrl) throw new Error(signError?.message || "Could not prepare image");
  return { image: data.signedUrl, imagePath: path };
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "key" });
      store.createIndex("scope", "scope");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error("Browser storage is blocked. Close other PreFrame tabs and retry."));
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
  const drafts = tool === 'notes' ? await pendingNotes(ownerId, projectId) : [];
  let records: ToolRecord[];
  try { records = await withTimeout(loadToolRecords(ownerId, projectId, tool), 20_000); }
  catch (error) { if (!drafts.length) throw error; records = await transaction('readonly', store => store.index('scope').getAll(scope(ownerId, projectId, tool))) as Stored[]; }
  const combined = new Map(records.map(record => [record.id, record]));
  drafts.forEach(draft => combined.set(draft.id, {...draft, pendingSync: true}));
  return [...combined.values()];
}
async function loadToolRecords(ownerId: string, projectId: string, tool: ToolName): Promise<ToolRecord[]> {
  const records = await transaction("readonly", store => store.index("scope").getAll(scope(ownerId, projectId, tool)));
  const local = (records as Stored[]).map(({ id, title, fields, createdAt, updatedAt, revision }) => ({ id, title, fields, createdAt, updatedAt, revision: revision || 0 }));
  const supabase = await cloudFor(ownerId);
  if (!supabase) return local;
  const { data, error } = await supabase.from("project_tool_records").select("id,title,fields,created_at,updated_at,revision").eq("project_id", projectId).eq("tool", tool).order("updated_at", { ascending: true });
  if (error) throw new Error(error.message);
  const remote = (data || []).map(row => fromCloud(row as CloudRow));
  if (!remote.length && local.length) {
    // One-time, non-destructive migration of this user's existing browser data.
    for (const record of local) {
      const { error: uploadError } = await supabase.rpc("save_project_tool_record", { p_project: projectId, p_tool: tool, p_record: record.id, p_title: record.title, p_fields: record.fields, p_expected_revision: 0 });
      if (uploadError && uploadError.code !== "40001") throw new Error(uploadError.message);
    }
    const { data: uploaded, error: reloadError } = await supabase.from("project_tool_records").select("id,title,fields,created_at,updated_at,revision").eq("project_id", projectId).eq("tool", tool).order("updated_at", { ascending: true });
    if (reloadError) throw new Error(reloadError.message);
    return signedToolImages(ownerId, (uploaded || []).map(row => fromCloud(row as CloudRow)));
  }
  return signedToolImages(ownerId, remote);
}
let draftQueue = Promise.resolve();
export function saveNoteDraft(ownerId: string, projectId: string, record: ToolRecord): Promise<void> {
  const snapshot = structuredClone(record);
  const task = draftQueue.then(async () => {
    await transaction('readwrite', store => store.put({...snapshot, key: `${scope(ownerId, projectId, 'notes')}:draft:${snapshot.id}`, scope: `${scope(ownerId, projectId, 'notes')}:draft`, tool: 'notes'}));
  });
  draftQueue = task.catch(() => {});
  return task;
}
async function pendingNotes(ownerId: string, projectId: string): Promise<ToolRecord[]> {
  const rows = await transaction('readonly', store => store.index('scope').getAll(`${scope(ownerId, projectId, 'notes')}:draft`));
  return (rows as Stored[]).map(({id,title,fields,revision,createdAt,updatedAt}) => ({id,title,fields,revision,createdAt,updatedAt}));
}
export async function clearSavedDraft(ownerId: string, projectId: string, record: ToolRecord, acknowledgedRevision?: number) {
  await draftQueue;
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE);
    const key = `${scope(ownerId, projectId, 'notes')}:draft:${record.id}`;
    const request = store.get(key);
    request.onsuccess = () => { const draft = request.result as Stored | undefined; if (draft && sameToolContent(draft, record)) store.delete(key);
      else if (draft && acknowledgedRevision !== undefined && draft.revision === record.revision) store.put({...draft, revision: acknowledgedRevision}); };
    tx.oncomplete = () => {db.close(); resolve();}; tx.onerror = () => {db.close(); reject(tx.error);};
  });
}
export function sameToolContent(left: ToolRecord, right: ToolRecord): boolean {
  return left.title === right.title && [...new Set([...Object.keys(left.fields), ...Object.keys(right.fields)])].every(key => (left.fields[key] || '') === (right.fields[key] || ''));
}
export class ToolRecordConflict extends Error {
  constructor(public current: ToolRecord) { super('Another tab saved a newer version of this item.'); }
}
export async function saveToolRecord(ownerId: string, projectId: string, tool: ToolName, record: ToolRecord, expectedRevision = 0): Promise<number> {
  if (tool === 'notes') await saveNoteDraft(ownerId, projectId, {...record, revision: expectedRevision});
  const supabase = await cloudFor(ownerId);
  const item: Stored = { ...record, revision: supabase ? expectedRevision : expectedRevision + 1, key: `${scope(ownerId, projectId, tool)}:${record.id}`, scope: scope(ownerId, projectId, tool), tool };
  const db = await database();
  const localRevision = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let conflict: ToolRecord | undefined;
    const request = store.get(item.key);
    request.onsuccess = () => {
      const current = request.result as Stored | undefined;
      if (!supabase && (current?.revision || 0) !== expectedRevision) { conflict = current; tx.abort(); return; }
      store.put(item);
    };
    tx.oncomplete = () => { db.close(); resolve(item.revision!); };
    tx.onabort = () => { db.close(); reject(conflict ? new ToolRecordConflict(conflict) : tx.error || new Error("Could not save this item on this device.")); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
  if (!supabase) { if (tool === 'notes') await clearSavedDraft(ownerId, projectId, {...record, revision: expectedRevision}, localRevision); return localRevision; }
  const {data, error} = await retryTransient(async () => {
    const result = await supabase.rpc("save_project_tool_record", { p_project: projectId, p_tool: tool, p_record: record.id, p_title: record.title, p_fields: record.fields, p_expected_revision: expectedRevision });
    if (result.error && /abort|network|fetch|timeout|timed out|connection|502|503|504/i.test(result.error.message)) throw new Error(result.error.message);
    return result;
  });
  let acknowledged = data;
  if (error?.code === '40001') {
    const {data: current} = await supabase.from('project_tool_records').select('id,title,fields,created_at,updated_at,revision').eq('project_id', projectId).eq('tool', tool).eq('id', record.id).single();
    if (current) {
      if (sameToolContent(record, fromCloud(current as CloudRow))) acknowledged = current;
      else throw new ToolRecordConflict(fromCloud(current as CloudRow));
    }
  }
  if (!acknowledged) throw new Error(error?.message || "Could not sync this record");
  const remote = fromCloud(acknowledged as CloudRow);
  // Keep the offline copy aligned to the authoritative cloud revision.
  const syncDb = await database();
  await new Promise<void>((resolve, reject) => { const tx = syncDb.transaction(STORE, "readwrite"); tx.objectStore(STORE).put({ ...remote, key: item.key, scope: item.scope, tool }); tx.oncomplete = () => { syncDb.close(); resolve(); }; tx.onerror = () => { syncDb.close(); reject(tx.error); }; });
  if (tool === 'notes') await clearSavedDraft(ownerId, projectId, {...record, revision: expectedRevision}, remote.revision);
  return remote.revision || localRevision;
}
export async function deleteToolRecord(ownerId: string, projectId: string, tool: ToolName, id: string): Promise<void> {
  if (tool === 'notes') { await draftQueue; await transaction('readwrite', store => store.delete(`${scope(ownerId, projectId, tool)}:draft:${id}`)); }
  await transaction("readwrite", store => store.delete(`${scope(ownerId, projectId, tool)}:${id}`));
  const supabase = await cloudFor(ownerId);
  if (!supabase) return;
  const { error } = await supabase.rpc("delete_project_tool_record", { p_project: projectId, p_record: id });
  if (error) throw new Error(error.message);
}
export function newToolRecord(title: string, fields: Record<string, string> = {}): ToolRecord {
  const timestamp = new Date().toISOString();
  return { id: crypto.randomUUID(), title, fields, createdAt: timestamp, updatedAt: timestamp, revision: 0 };
}
const tools: ToolName[] = ["screenplay", "notes", "shots", "storyboards", "schedule", "locations", "call-sheets"];
export async function exportToolData(ownerId: string, projectId: string): Promise<string> {
  const records = Object.fromEntries(await Promise.all(tools.map(async tool => [tool, await toolRecords(ownerId, projectId, tool)])));
  return JSON.stringify({ format: "preframe-local-tools-v1", projectId, exportedAt: new Date().toISOString(), records }, null, 2);
}
export async function restoreToolData(ownerId: string, projectId: string, source: string): Promise<number> {
  if (source.length > 320_000_000) throw new Error("Backup exceeds the 320 MB import limit");
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
      store.put({ ...row, revision: Number.isSafeInteger(row.revision) && row.revision! >= 0 ? row.revision : 1, key: `${scope(ownerId, projectId, tool)}:${row.id}`, scope: scope(ownerId, projectId, tool), tool });
      count++;
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(new Error("Restore was cancelled; no records were changed")); };
  });
  return count;
}
export async function clearToolData(ownerId: string, projectId: string): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const prefix = `${ownerId}:${projectId}:`;
    const cursor = store.openCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
    cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
