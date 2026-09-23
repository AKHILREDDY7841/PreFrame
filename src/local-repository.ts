import { type Identity, type Project, sampleProject } from "./domain.js";
import type { ProjectRepository, WriteResult } from "./repository.js";
const DB = "preframe-local-v1"; const STORE = "projects";
function openDb(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(DB, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function allProjects() { const db = await openDb(); return new Promise<Project[]>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function put(project: Project) { const db = await openDb(); return new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(project); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
export class LocalProjectRepository implements ProjectRepository {
  constructor(private identity: Identity | null = { profile: { id: "local-demo-owner", displayName: "Akhil", tier: "free" }, isAdmin: false }) {}
  async getIdentity() { return this.identity; }
  async listProjects() { const projects = await allProjects(); return projects.length ? projects : [sampleProject]; }
  async getProject(id: string) { return (await this.listProjects()).find((project) => project.id === id) || null; }
  async saveProject(project: Project, expectedRevision: number): Promise<WriteResult<Project>> { const current = await this.getProject(project.id); if (current && current.revision !== expectedRevision) return { kind: "conflict", latest: { value: current, revision: current.revision } }; const value = { ...project, revision: expectedRevision + 1, updatedAt: new Date().toISOString() }; await put(value); return { kind: "ok", value: { value, revision: value.revision } }; }
}
