import type { Identity, Project, UUID } from "./domain.js";
export type Revisioned<T> = { value: T; revision: number };
export type WriteResult<T> = { kind: "ok"; value: Revisioned<T> } | { kind: "conflict"; latest: Revisioned<T> } | { kind: "offline"; message: string };
export interface ProjectRepository { getIdentity(): Promise<Identity | null>; listProjects(): Promise<Project[]>; getProject(id: UUID): Promise<Project | null>; saveProject(project: Project, expectedRevision: number): Promise<WriteResult<Project>>; }
