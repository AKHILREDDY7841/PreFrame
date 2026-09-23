export type UUID = string;
export type Tier = "free" | "premium" | "admin";
export type MemberRole = "owner" | "editor";

export interface Project { id: UUID; ownerId: UUID; title: string; timezone: string; revision: number; updatedAt: string; sample?: boolean; }
export interface ScreenplayDraft { id: UUID; projectId: UUID; title: string; revision: number; }
export interface ScreenplayBlock { id: UUID; draftId: UUID; kind: string; text: string; revision: number; }
export interface Scene { id: UUID; projectId: UUID; heading: string; displayNumber: number; }
export interface Shot { id: UUID; projectId: UUID; sceneId: UUID; ordinal: number; }
export interface StoryboardFrame { id: UUID; projectId: UUID; shotId?: UUID; ordinal: number; }
export interface ShootDay { id: UUID; projectId: UUID; date: string; }
export interface ScheduleEntry { id: UUID; projectId: UUID; shootDayId: UUID; sceneId?: UUID; }
export interface Location { id: UUID; projectId: UUID; name: string; }
export interface CallSheetVersion { id: UUID; projectId: UUID; version: number; publishedAt?: string; }
export interface Profile { id: UUID; displayName: string; tier: Tier; }
export interface Identity { profile: Profile; isAdmin: boolean; }
export type SyncState = "saved-locally" | "syncing" | "synced" | "sync-failed" | "conflict";

export const sampleProject: Project = { id: "11111111-1111-4111-8111-111111111111", ownerId: "local-demo-owner", title: "Sample: Rain at the Edit", timezone: "Asia/Kolkata", revision: 1, updatedAt: "2026-09-24T00:00:00.000Z", sample: true };
export const isImmutableSceneId = (before: Scene, after: Scene) => before.id === after.id;
