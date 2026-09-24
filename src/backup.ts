import { supabase } from "./cloud.js";

const projectTables = [
  "screenplay_drafts", "screenplay_blocks", "scenes", "screenplay_comments",
  "notes", "characters", "actors", "locations", "media", "shots",
  "storyboard_frames", "shoot_days", "schedule_entries", "call_sheet_versions",
] as const;
type Content = Record<string, unknown[]>;
type MediaFile = { path: string; mime: string; bytes: number; sha256: string; base64: string };
export type Backup = {
  manifest: { format: "preframe-project"; version: 1; exportedAt: string; projectId: string;
    contentSha256: string; warnings: string[] };
  content: Content;
  files: MediaFile[];
};
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
async function sha256(bytes: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource)));
}
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 16384)
    binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
  return btoa(binary);
}
function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error("Invalid media encoding");
  const binary = atob(value); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function exportProject(projectId: string): Promise<Backup> {
  const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (projectError || !project) throw new Error("Project unavailable or access denied");
  const content: Content = { projects: [project] };
  for (const table of projectTables) {
    const { data, error } = await supabase.from(table).select("*").eq("project_id", projectId);
    if (error) throw new Error(`Cannot export ${table}: ${error.message}`);
    content[table] = data || [];
  }
  const characterIds = (content.characters as { id: string }[]).map(row => row.id);
  if (characterIds.length) {
    const { data, error } = await supabase.from("character_actors").select("*").in("character_id", characterIds);
    if (error) throw new Error(`Cannot export cast links: ${error.message}`);
    content.character_actors = data || [];
  } else content.character_actors = [];
  const files: MediaFile[] = [];
  for (const media of content.media as { storage_path: string; content_type: string }[]) {
    const { data, error } = await supabase.storage.from("project-media").download(media.storage_path);
    if (error || !data) throw new Error(`Cannot export media ${media.storage_path}: ${error?.message || "missing file"}`);
    const bytes = new Uint8Array(await data.arrayBuffer());
    files.push({ path: media.storage_path, mime: media.content_type, bytes: bytes.length,
      sha256: await sha256(bytes), base64: encodeBase64(bytes) });
  }
  return {
    manifest: { format: "preframe-project", version: 1, exportedAt: new Date().toISOString(),
      projectId, contentSha256: await sha256(encoder.encode(JSON.stringify(content))),
      warnings: ["This export excludes unsynced local changes and any original media files that were never uploaded.",
        "Account credentials and invitation access are not included."] },
    content, files,
  };
}

export async function previewBackup(raw: string): Promise<{ projectId: string; title: string; records: Record<string, number>; files: number; warnings: string[] }> {
  if (raw.length > 50_000_000) throw new Error("Archive is too large to preview safely");
  let backup: Backup;
  try { backup = JSON.parse(raw); } catch { throw new Error("Archive is not valid JSON"); }
  if (!backup || backup.manifest?.format !== "preframe-project" || backup.manifest.version !== 1
    || !backup.content || !Array.isArray(backup.files) || !Array.isArray(backup.content.projects)
    || backup.content.projects.length !== 1) throw new Error("Unsupported or incomplete Preframe archive");
  for (const table of projectTables) if (!Array.isArray(backup.content[table])) throw new Error(`Missing ${table} records`);
  if (!Array.isArray(backup.content.character_actors)) throw new Error("Missing cast links");
  const project = backup.content.projects[0] as { id?: string; title?: string };
  if (project.id !== backup.manifest.projectId || typeof project.title !== "string") throw new Error("Project manifest does not match content");
  for (const table of projectTables) {
    for (const row of backup.content[table] as { project_id?: string }[])
      if (!row || typeof row !== "object" || row.project_id !== project.id)
        throw new Error(`Cross-project or invalid ${table} record`);
  }
  const characterIds = new Set((backup.content.characters as { id: string }[]).map(row => row.id));
  const actorIds = new Set((backup.content.actors as { id: string }[]).map(row => row.id));
  for (const link of backup.content.character_actors as { character_id: string; actor_id: string }[])
    if (!characterIds.has(link.character_id) || !actorIds.has(link.actor_id))
      throw new Error("Invalid cast relationship");
  if (await sha256(encoder.encode(JSON.stringify(backup.content))) !== backup.manifest.contentSha256)
    throw new Error("Structured content checksum does not match");
  const paths = new Set<string>();
  for (const file of backup.files) {
    if (typeof file.path !== "string" || !file.path.startsWith(`${project.id}/`) || paths.has(file.path))
      throw new Error("Invalid or duplicate media path");
    paths.add(file.path);
    const bytes = decodeBase64(file.base64);
    if (bytes.length !== file.bytes || await sha256(bytes) !== file.sha256) throw new Error(`Media checksum does not match: ${file.path}`);
  }
  const mediaPaths = new Set((backup.content.media as { storage_path: string }[]).map(row => row.storage_path));
  if (mediaPaths.size !== paths.size || [...mediaPaths].some(path => !paths.has(path))) throw new Error("Media manifest is incomplete");
  return { projectId: project.id!, title: project.title,
    records: Object.fromEntries(Object.entries(backup.content).map(([name, rows]) => [name, rows.length])),
    files: backup.files.length, warnings: backup.manifest.warnings || [] };
}
