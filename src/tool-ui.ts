import { mountNoteEditor } from "./note-editor.js";
import { studioDocument } from "./studio-documents.js";
import { studioShell } from "./studio-shell.js";
import type { Project } from "./domain.js";
import { deleteToolRecord, newToolRecord, saveToolRecord, storeToolImage, toolRecords, type ToolName, type ToolRecord } from "./tool-data.js";

let activeToolChannel: { unsubscribe: () => unknown } | null = null;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const labels: Record<ToolName, string> = { screenplay: "Screenplay", notes: "Docs & Notes", shots: "Shot Lists", storyboards: "Storyboards", schedule: "Production Schedule", locations: "Locations", "call-sheets": "Call Sheets" };
const fields: Record<ToolName, { key: string; label: string; type?: string }[]> = {
  screenplay: [{ key: "kind", label: "Element" }, { key: "text", label: "Script text" }],
  notes: [{ key: "body", label: "Note" }],
  shots: [{ key: "scene", label: "Scene" }, { key: "description", label: "Description" }, { key: "size", label: "Shot size" }, { key: "type", label: "Shot type" }, { key: "movement", label: "Movement" }, { key: "estimate", label: "Est. time" }, { key: "image", label: "Image URL", type: "url" }],
  storyboards: [{ key: "shot", label: "Shot" }, { key: "description", label: "Description" }, { key: "sound", label: "Sound effects" }, { key: "video", label: "Video reference URL", type: "url" }, { key: "image", label: "Image URL", type: "url" }],
  schedule: [{ key: "day", label: "Day" }, { key: "date", label: "Date", type: "date" }, { key: "location", label: "Location" }, { key: "scenes", label: "Scene(s)" }, { key: "script", label: "Script" }, { key: "scriptPages", label: "Pages" }, { key: "time", label: "Time" }, { key: "characters", label: "Characters" }, { key: "actorsRequired", label: "Actors Required" }, { key: "props", label: "Props" }, { key: "costumes", label: "Costumes" }, { key: "equipment", label: "Equipment" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "postStatus", label: "Backup Status" }, { key: "notes", label: "Notes" }],
  locations: [{ key: "address", label: "Address" }, { key: "contact", label: "Contact" }, { key: "phone", label: "Phone" }, { key: "permit", label: "Permission / permit details" }, { key: "availability", label: "Available dates and times" }, { key: "interiorExterior", label: "Interior / exterior" }, { key: "access", label: "Access / parking" }, { key: "travel", label: "Travel and logistics" }, { key: "safety", label: "Safety / contingency" }, { key: "notes", label: "Notes" }],
  "call-sheets": [{ key: "date", label: "Shoot date", type: "date" }, { key: "call", label: "General call", type: "time" }, { key: "wrap", label: "Estimated wrap", type: "time" }, { key: "location", label: "Location" }, { key: "address", label: "Address / access instructions" }, { key: "weather", label: "Weather (manual, with source/date)" }, { key: "castCalls", label: "Cast calls / makeup" }, { key: "crewCalls", label: "Crew and department calls" }, { key: "meals", label: "Meals / breaks" }, { key: "moves", label: "Company moves / parking" }, { key: "contacts", label: "Emergency contacts (verified)" }, { key: "hospital", label: "Nearest hospital (verified)" }, { key: "schedule", label: "Schedule snapshot" }, { key: "notes", label: "Important notes / requirements" }],
};
export const screenplayKinds = ["Act", "Scene Heading", "Action", "Character", "Dialogue", "Parenthetical", "Transition", "Shot", "Text"] as const;
export type ScreenplayKind = typeof screenplayKinds[number];
export type ScreenplayScene = { id: string; number: number; heading: string; startBlockId: string; endBlockId: string };
const screenplayTabKinds: ScreenplayKind[] = ["Scene Heading", "Action", "Character", "Dialogue", "Parenthetical", "Transition", "Shot", "Text", "Act"];
const enterTransitions: Partial<Record<ScreenplayKind, ScreenplayKind>> = { "Scene Heading": "Action", Action: "Action", Character: "Dialogue", Dialogue: "Action", Parenthetical: "Dialogue", Transition: "Scene Heading", Shot: "Action", Text: "Action", Act: "Scene Heading" };
export function nextScreenplayKind(kind: string, empty = false): ScreenplayKind {
  const current = screenplayKinds.includes(kind as ScreenplayKind) ? kind as ScreenplayKind : "Action";
  if (empty && current === "Dialogue") return "Action";
  return enterTransitions[current] || "Action";
}
export function cycleScreenplayKind(kind: string, backwards = false): ScreenplayKind {
  const index = screenplayTabKinds.indexOf(kind as ScreenplayKind);
  return screenplayTabKinds[(index + (backwards ? screenplayTabKinds.length - 1 : 1) + screenplayTabKinds.length) % screenplayTabKinds.length];
}
export function deriveScreenplayScenes(records: ToolRecord[]): ScreenplayScene[] {
  const ordered = [...records].sort((a, b) => (a.fields.order || a.createdAt).localeCompare(b.fields.order || b.createdAt));
  const headings = ordered.map((record, index) => ({ record, index })).filter(({ record }) => record.fields.kind === "Scene Heading");
  return headings.map(({ record, index }, sceneIndex) => ({ id: record.id, number: sceneIndex + 1, heading: (record.fields.text || record.title || "Untitled scene").split("\n")[0], startBlockId: record.id, endBlockId: headings[sceneIndex + 1] ? ordered[headings[sceneIndex + 1].index - 1].id : ordered.at(-1)?.id || record.id }));
}
export function characterSuggestions(records: ToolRecord[], query: string): string[] {
  const key = query.trim().toLocaleUpperCase();
  return [...new Set(records.filter(record => record.fields.kind === "Character").map(record => record.fields.text.trim().toLocaleUpperCase()).filter(Boolean))].filter(name => !key || name.includes(key)).sort((a, b) => a.localeCompare(b));
}
export function sceneHeadingSuggestions(records: ToolRecord[], query: string): string[] {
  const key = query.trim().toLocaleUpperCase();
  const defaults = ["INT.", "EXT.", "INT./EXT."];
  const existing = records.filter(record => record.fields.kind === "Scene Heading").map(record => record.fields.text.trim().toLocaleUpperCase()).filter(Boolean);
  return [...new Set([...defaults, ...existing])].filter(value => !key || value.includes(key)).slice(0, 6);
}
export const localDateISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
type TextComment = { id: string; blockId?: string; from: number; to: number; quote: string; body: string; orphaned: boolean; resolved: boolean; replies?: { id: string; body: string; createdAt: string }[] };
export function remapTextComment(comment: TextComment, before: string, after: string): TextComment {
  if (before === after || comment.orphaned) return comment;
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  const removedEnd = before.length - suffix;
  const insertedEnd = after.length - suffix;
  if (removedEnd <= comment.from) {
    const delta = insertedEnd - removedEnd;
    return { ...comment, from: comment.from + delta, to: comment.to + delta };
  }
  if (prefix >= comment.to) return comment;
  if (prefix > comment.from && removedEnd < comment.to) {
    const to = comment.to + insertedEnd - removedEnd;
    return { ...comment, to, quote: after.slice(comment.from, to) };
  }
  return { ...comment, orphaned: true };
}
const safeImage = (value: string) => /^(https?:\/\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(value) ? value : "";
const shotChoices: Record<string, string[]> = {
  size: ["Extreme wide", "Wide (WS)", "Medium wide", "Medium (MS)", "Medium close-up", "Close-up", "Extreme close-up"],
  type: ["Eye level", "Low angle", "High angle", "Over the shoulder", "Point of view", "Aerial", "Dutch angle"],
  movement: ["Static", "Pan", "Tilt", "Dolly", "Tracking", "Handheld", "Crane", "Zoom"],
};
const scheduleChoices: Record<string, string[]> = { priority: ["High", "Medium", "Low"], status: ["Not Started", "Scheduled", "In Progress", "Completed"], postStatus: ["Pending", "Good", "N/A", "Not Scouted", "In Progress", "Completed"] };
const legacyScheduleKeys: Record<string, string> = { scenes: "sceneNumbers", props: "propsRequired", equipment: "equipmentRequired", postStatus: "backupStatus" };
const scheduleValue = (record: ToolRecord, key: string) => record.fields[key] || record.fields[legacyScheduleKeys[key] || ""] || "";
export type ScheduleProgress = { total: number; completed: number; remaining: number; percentage: number; inProgress: number };
/** A shoot day is a shared Day label first, then a shared date. A day is complete only when every entry on it is complete. */
export function scheduleProgress(records: ToolRecord[]): ScheduleProgress {
  const days = new Map<string, ToolRecord[]>();
  for (const record of records) {
    const key = record.fields.day?.trim() ? `day:${record.fields.day.trim()}` : record.fields.date ? `date:${record.fields.date}` : `entry:${record.id}`;
    days.set(key, [...(days.get(key) || []), record]);
  }
  const grouped = [...days.values()];
  const completed = grouped.filter(day => day.every(record => record.fields.status === "Completed")).length;
  const inProgress = grouped.filter(day => !day.every(record => record.fields.status === "Completed") && day.some(record => record.fields.status === "In Progress")).length;
  const total = grouped.length;
  return { total, completed, remaining: total - completed, percentage: total ? Math.round(completed / total * 100) : 0, inProgress };
}
function shotChoice(key: string, value: string): string {
  const custom = Boolean(value && !shotChoices[key].includes(value));
  return `<label>${key === "size" ? "Shot size" : key === "type" ? "Shot type" : "Movement"}<select data-shot-choice="${key}" aria-label="${key === "size" ? "Shot size" : key === "type" ? "Shot type" : "Movement"}"><option value="">Select…</option>${shotChoices[key].map(choice => `<option value="${escapeHtml(choice)}" ${choice === value ? "selected" : ""}>${escapeHtml(choice)}</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>Custom…</option></select><input name="${key}" value="${escapeHtml(value)}" placeholder="Enter custom ${key}" ${custom ? "" : "hidden"}></label>`;
}
async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .78));
  if (!blob || blob.size > 2_000_000) throw new Error("Image is too large after compression (2 MB maximum)");
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
}
const toolNavigation = (projectId: string, href: (path: string) => string) =>
  `<nav class="tool-nav" aria-label="Project tools">${(["screenplay", "notes", "shots", "storyboards", "schedule", "calendar", "call-sheets", "locations"] as const).map(tool => `<a href="${href(`/app/projects/${projectId}/${tool}`)}" data-route data-tool-nav="${tool}">${tool === "call-sheets" ? "Call sheets" : tool[0].toUpperCase() + tool.slice(1)}</a>`).join("")}</nav>`;

function screenplayEditorMarkup(project: Project, selected: ToolRecord, items: ToolRecord[]): string {
  const element = (item: ToolRecord) => {
    const kind = screenplayKinds.includes(item.fields.kind as typeof screenplayKinds[number]) ? item.fields.kind : "Text";
    const kindClass = kind.toLowerCase().replaceAll(" ", "-");
    if (item.id !== selected.id) return `<button type="button" class="script-block script-block-preview script-${kindClass}" data-script-id="${escapeHtml(item.id)}" data-script-select="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(kind)} element">${escapeHtml(item.fields.text || " ")}</button>`;
    return `<div class="script-block script-block-active script-${kindClass} ${item.fields.comments && item.fields.comments !== "[]" ? "script-block-commented" : ""}" data-script-id="${escapeHtml(item.id)}"><span class="script-block-kind">${escapeHtml(kind)}</span><textarea name="text" aria-label="Script text" dir="auto" rows="${Math.max(2, Math.min(12, (item.fields.text || "").split("\n").length + 1))}" spellcheck="true">${escapeHtml(item.fields.text || "")}</textarea><div class="script-suggestions" id="script-suggestions" role="listbox" hidden></div><button type="button" class="script-selection-action" id="script-comment-open" aria-label="Add comment to selected text" hidden>Add comment</button></div>`;
  };
  const pages: ToolRecord[][] = [];
  let page: ToolRecord[] = [];
  let pageWeight = 0;
  for (const item of items) {
    const weight = Math.max(1, Math.ceil((item.fields.text || "").length / 700));
    if (page.length && pageWeight + weight > 14) { pages.push(page); page = []; pageWeight = 0; }
    page.push(item); pageWeight += weight;
  }
  if (page.length) pages.push(page);
  const pageMarkup = pages.map((entries, index) => `<article class="script-page" aria-label="Screenplay page ${index + 1}"><div class="script-page-header"><span>${escapeHtml(project.title)}</span><span>Page ${index + 1}</span></div><div class="script-page-content">${entries.map(element).join("")}</div></article>`).join("");
  return `<form id="tool-form" class="script-editor-form"><div class="script-toolbar"><div class="script-toolbar-main"><label class="script-kind-label">Element <select name="kind">${screenplayKinds.map((kind, index) => `<option value="${escapeHtml(kind)}" ${selected.fields.kind === kind ? "selected" : ""}>${escapeHtml(kind)} — Ctrl+${index}</option>`).join("")}</select></label><span class="script-shortcuts">Tab changes element · Ctrl+1–7 formats the current block</span></div><div class="script-toolbar-actions"><button type="button" id="script-navigator-toggle" aria-expanded="false" aria-controls="tool-list">Scenes</button><button type="button" id="tool-up" aria-label="Move element up">↑</button><button type="button" id="tool-down" aria-label="Move element down">↓</button><button type="button" id="script-comments-toggle" aria-expanded="false" aria-controls="script-comments-panel">Comments</button><button type="button" id="tool-print">Export PDF</button><button type="button" id="tool-remove" class="danger-text">Delete element</button></div></div><input type="hidden" name="title" value="${escapeHtml(selected.title)}"><div class="script-layout"><div class="script-pages">${pageMarkup}</div><aside class="tool-comments script-comments" id="script-comments-panel" aria-label="Screenplay comments" hidden><div class="script-comments-head"><h2>Comments</h2><button type="button" id="script-comments-close" aria-label="Close comments">×</button></div><div id="tool-comment-list"></div></aside></div><div class="script-comment-composer" id="script-comment-composer" hidden><p>Comment on <q id="script-selected-quote"></q></p><label for="tool-comment-body">Comment</label><textarea id="tool-comment-body" rows="3" placeholder="Write a note about this passage"></textarea><div><button type="button" id="tool-comment-add">Post comment</button><button type="button" id="script-comment-cancel">Cancel</button></div></div></form>`;
}

export function toolWorkspace(project: Project, name: string, href: (path: string) => string): string {
  const tool: ToolName = name === "calendar" ? "schedule" : name as ToolName;
  const label = name === "calendar" ? "Calendar" : labels[tool];
  const write = tool === "screenplay" || tool === "notes";
  const title = tool === "screenplay" ? `<span>Screenplay</span><small>${escapeHtml(project.title)}</small>` : `<span>${label}</span><small>${escapeHtml(project.title)}</small>`;
  const content = `<div class="studio-toolbar"><h2 class="studio-tool-title">${title}</h2><div class="studio-toolbar-actions">${write ? '<button id="eye" type="button" aria-pressed="false">Eye saver</button>' : ""}${tool === "schedule" ? '<button id="schedule-columns" type="button" aria-label="Choose production schedule columns">☷ Columns</button>' : ""}${["schedule", "shots", "storyboards"].includes(tool) ? '<button id="studio-print" type="button">Print / PDF</button>' : ""}<button id="studio-export" type="button">Export CSV</button><button id="tool-add" class="button" type="button">＋ ${tool === "screenplay" ? "Add element" : tool === "notes" ? "New document" : tool === "shots" ? "Add shot" : tool === "storyboards" ? "Add frame" : tool === "schedule" ? "Add shoot day" : tool === "locations" ? "Add location" : "New call sheet"}</button></div></div><p class="tool-save-status" id="tool-status" role="status">Loading…</p><div class="tool-body"><aside class="tool-list" id="tool-list" aria-label="${label} items"></aside><section class="tool-editor" id="tool-editor" aria-label="Editor"></section></div><article id="tool-print-document" aria-hidden="true"></article>`;
  return studioShell(project.id, project.title, name, label, content, href);
}

export async function mountToolWorkspace(project: Project, name: string, userId: string, premium = false): Promise<void> {
  const tool: ToolName = name === "calendar" ? "schedule" : name as ToolName;
  const list = document.querySelector<HTMLElement>("#tool-list")!;
  const editor = document.querySelector<HTMLElement>("#tool-editor")!;
  const status = document.querySelector<HTMLElement>("#tool-status")!;
  const workspace = document.querySelector<HTMLElement>(".studio-workspace")!;
  const sidebarToggle = document.querySelector<HTMLButtonElement>("#studio-sidebar-toggle");
  const sidebarKey = "preframe-studio-sidebar";
  const sceneNavigatorKey = `preframe-scene-navigator-v2:${userId}:${project.id}`;
  const setSidebar = (open: boolean) => {
    workspace.classList.toggle("studio-sidebar-open", open);
    sidebarToggle?.setAttribute("aria-expanded", String(open));
    localStorage.setItem(sidebarKey, String(open));
  };
  const setSceneNavigator = (open: boolean) => {
    workspace.classList.toggle("scene-navigator-open", open);
    document.querySelector<HTMLButtonElement>("#script-navigator-toggle")?.setAttribute("aria-expanded", String(open));
    localStorage.setItem(sceneNavigatorKey, String(open));
  };
  setSidebar(localStorage.getItem(sidebarKey) === "true");
  sidebarToggle?.addEventListener("click", () => setSidebar(!workspace.classList.contains("studio-sidebar-open")));
  workspace.querySelector<HTMLButtonElement>("#studio-sidebar-close")?.addEventListener("click", () => setSidebar(false));
  workspace.querySelectorAll<HTMLAnchorElement>(".studio-sidebar a[data-route]").forEach(link => link.addEventListener("click", () => setSidebar(false)));
  const isCurrent = () => document.querySelector<HTMLElement>(".tool-page")?.dataset.project === project.id && document.querySelector<HTMLElement>(".tool-page")?.dataset.tool === name;
  let records = await toolRecords(userId, project.id, tool);
  const screenplayScenes = tool === "shots" || tool === "storyboards" ? (await toolRecords(userId, project.id, "screenplay")).filter(item => item.fields.kind === "Scene Heading") : [];
  const projectShots = tool === "storyboards" ? await toolRecords(userId, project.id, "shots") : [];
  if (!isCurrent()) return;
  let selected: string | undefined = records[0]?.id;
  let activeScene = "all";
  let boardView = "grid";
  let visualQuery = "";
  let inspectorOpen = false;
  let revealSelected = false;
  let calendarView: "timeline" | "month" | "week" | "day" = "month";
  const scheduleViewKey = `preframe-schedule-fields:${userId}:${project.id}`;
  let savedScheduleFields: string[] | null = null;
  try { const stored = JSON.parse(localStorage.getItem(scheduleViewKey) || "null"); if (Array.isArray(stored)) savedScheduleFields = stored.filter((key): key is string => typeof key === "string"); } catch { /* Use the full schedule view. */ }
  let scheduleVisible = new Set(savedScheduleFields?.length ? savedScheduleFields : records.length ? fields.schedule.map(field => field.key) : ["date", "location", "scenes", "scriptPages", "time", "status"]);

  let scheduleChooserOpen = !savedScheduleFields && records.length === 0;
  let calendarMonth = new Date();
  const savedRevisions = new Map(records.map(record => [record.id, record.revision || 0]));
  let saveQueue = Promise.resolve();
  let screenplaySaveTimer: ReturnType<typeof setTimeout> | undefined;
  let flushScreenplaySave = () => {};
  const ordered = () => [...records].sort((a, b) => (a.fields.order || a.createdAt).localeCompare(b.fields.order || b.createdAt));
  const persist = (record: ToolRecord) => {
    status.textContent = "Saving on this device…";
    const snapshot = { ...record, fields: { ...record.fields }, updatedAt: new Date().toISOString() };
    const task = saveQueue.then(async () => {
      const revision = await saveToolRecord(userId, project.id, tool, snapshot, savedRevisions.get(record.id) || 0);
      savedRevisions.set(record.id, revision);
      record.revision = revision;
      record.updatedAt = snapshot.updatedAt;
      if (isCurrent()) status.textContent = userId === "local-demo-owner" ? "Saved in this browser" : "Synced to project cloud";
    });
    saveQueue = task.catch(() => {});
    return task;
  };
  document.querySelector("#studio-print")?.addEventListener("click", () => {
    const paper = document.querySelector<HTMLElement>("#tool-print-document")!;
    paper.innerHTML = `<h1>${escapeHtml(project.title)} — ${labels[tool]}</h1>${ordered().map(item => `<section class="studio-print-record"><h2>${escapeHtml(item.title)}</h2>${safeImage(item.fields.image || '') ? `<img src="${escapeHtml(safeImage(item.fields.image))}" alt="Reference image">` : ''}${fields[tool].filter(field => field.key !== 'image').map(field => `<p><b>${escapeHtml(field.label)}:</b> ${escapeHtml(item.fields[field.key] || '—')}</p>`).join('')}</section>`).join('')}`;
    print();
  });
  document.querySelector("#studio-export")?.addEventListener("click", () => {
    const columns = [{ key: "title", label: "Title" }, ...fields[tool]];
    for (const key of new Set(records.flatMap(item => Object.keys(item.fields)))) if (!columns.some(column => column.key === key) && !["order", "richBody"].includes(key)) columns.push({ key, label: key });
    const csv = (value: string) => '"' + (/^[=+@\-]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
    const output = [columns.map(c => csv(c.label)).join(","), ...ordered().map(item => columns.map(c => csv(c.key === "title" ? item.title : item.fields[c.key] || "")).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", output], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = tool + ".csv"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const renderList = () => {
    const items = ordered();
    if (name === "calendar") {
      list.innerHTML = `<h2>Shoot days</h2>${items.length ? items.map(record => `<button type="button" class="tool-list-item ${record.id === selected ? "selected" : ""}" data-select="${record.id}"><strong>${escapeHtml(record.fields.date || "No date")}</strong><small>${escapeHtml(record.title)}</small></button>`).join("") : '<p class="tool-empty">Add an entry in Schedule to see it here.</p>'}`;
    } else if (tool === "shots" || tool === "storyboards") {
      const sceneOptions = screenplayScenes.map((scene, index) => `<button type="button" class="scene-nav-item ${activeScene === scene.id ? "selected" : ""}" data-scene="${escapeHtml(scene.id)}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(scene.fields.text || scene.title)} <small>${items.filter(item => item.fields.sceneId === scene.id).length}</small></button>`).join("");
      list.innerHTML = `<h2>Scenes <span>${screenplayScenes.length}</span></h2><button type="button" class="scene-nav-item ${activeScene === "all" ? "selected" : ""}" data-scene="all">All ${tool === "shots" ? "shots" : "frames"} <small>${items.length}</small></button>${sceneOptions}${screenplayScenes.length ? '<p class="tool-list-hint">Scenes come from screenplay headings.</p>' : '<p class="tool-list-hint">Add scene headings in Screenplay to group your work.</p>'}`;
    } else if (tool === "notes") {
      list.innerHTML = `<h2>All documents <span>${items.length}</span></h2>${items.length ? items.map(item => `<button type="button" class="tool-list-item ${item.id === selected ? "selected" : ""}" data-select="${escapeHtml(item.id)}"><strong>▤ ${escapeHtml(item.title)}</strong><small>${new Date(item.updatedAt).toLocaleDateString()}</small></button>`).join("") : '<div class="notes-list-empty"><span>▤</span><p>No documents yet</p><button type="button" id="notes-start">＋ New document</button></div>'}`;
    } else {
      const scenes = tool === "screenplay" ? deriveScreenplayScenes(items) : [];
      const sceneNav = tool === "screenplay" ? `<nav class="scene-nav" aria-label="Scene navigator"><div class="scene-nav-head"><h2>Scenes <span>${scenes.length}</span></h2><button type="button" id="script-navigator-close" aria-label="Close scene navigator">←</button></div><input id="scene-nav-search" type="search" placeholder="Find a scene" aria-label="Search scenes">${scenes.length ? `<div id="scene-nav-results">${scenes.map(scene => `<button type="button" class="scene-nav-item ${scene.id === selected ? "selected" : ""}" data-select="${escapeHtml(scene.id)}"><span>${String(scene.number).padStart(2, "0")}</span>${escapeHtml(scene.heading)}</button>`).join("")}</div>` : '<p class="tool-empty">Add a Scene Heading to build your navigator.</p>'}</nav>` : "";
      const elementIndex = items.length ? items.map((record, index) => `<button type="button" class="tool-list-item ${record.id === selected ? "selected" : ""}" data-select="${escapeHtml(record.id)}"><small>${index + 1 < 10 ? `0${index + 1}` : index + 1}${tool === "screenplay" ? ` · ${escapeHtml(record.fields.kind || "Action")}` : ""}</small><strong>${escapeHtml(record.title || "Untitled")}</strong></button>`).join("") : '<p class="tool-empty">Nothing here yet. Create the first item.</p>';
      list.innerHTML = tool === "screenplay" ? `${sceneNav}<details class="script-element-index"><summary>All elements <span>${items.length}</span></summary>${elementIndex}</details>` : `<h2>Items <span>${items.length}</span></h2>${elementIndex}`;
    }
    list.querySelectorAll<HTMLButtonElement>("[data-select]").forEach(button => button.onclick = () => { selected = button.dataset.select; revealSelected = tool === "screenplay"; renderList(); renderEditor(); });
    list.querySelector<HTMLButtonElement>("#script-navigator-close")?.addEventListener("click", () => setSceneNavigator(false));
    list.querySelector<HTMLInputElement>("#scene-nav-search")?.addEventListener("input", event => {
      const query = (event.currentTarget as HTMLInputElement).value.trim().toLocaleLowerCase();
      list.querySelectorAll<HTMLButtonElement>("#scene-nav-results [data-select]").forEach(button => { button.hidden = !button.textContent!.toLocaleLowerCase().includes(query); });
    });
    list.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach(button => button.onclick = () => { activeScene = button.dataset.scene || "all"; selected = ordered().find(item => activeScene === "all" || item.fields.sceneId === activeScene)?.id; renderList(); renderEditor(); });
    list.querySelector("#notes-start")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
  };
  const renderEditor = () => {
    const record = records.find(item => item.id === selected);
    const scheduleBoard = () => {
      const items = ordered();
      const progress = scheduleProgress(items);
      const visibleFields = fields.schedule.filter(field => scheduleVisible.has(field.key));
      const columns = visibleFields.map(field => field.label);
      const choice = (item: ToolRecord, key: string) => `<select data-schedule-cell="${key}" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} ${escapeHtml(key)}">${scheduleChoices[key].map(value => `<option value="${value}" ${(scheduleValue(item, key) || (key === "status" ? "Not Started" : key === "priority" ? "Medium" : "Pending")) === value ? "selected" : ""}>${value}</option>`).join("")}</select>`;
      const cell = (item: ToolRecord, field: { key: string; label: string; type?: string }) => {
        if (scheduleChoices[field.key]) return choice(item, field.key);
        const value = scheduleValue(item, field.key);
        const multiline = ["characters", "actorsRequired", "props", "costumes", "equipment", "notes"].includes(field.key);
        return multiline ? `<textarea rows="2" data-schedule-cell="${field.key}" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} ${escapeHtml(field.label)}">${escapeHtml(value)}</textarea>` : `<input type="${field.type || "text"}" value="${escapeHtml(value)}" data-schedule-cell="${field.key}" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} ${escapeHtml(field.label)}">`;
      };
      return `<div class="schedule-board"><details class="schedule-field-chooser" ${scheduleChooserOpen ? "open" : ""}><summary>Customize columns <span>${columns.length} of ${fields.schedule.length} shown</span></summary><p>Show the details you need. Hidden values remain saved. You can add or remove columns at any time. At least one column must remain visible.</p><div class="schedule-field-options">${fields.schedule.map(field => `<label><input type="checkbox" data-schedule-visible="${field.key}" ${scheduleVisible.has(field.key) ? "checked" : ""} >${escapeHtml(field.label)}</label>`).join("")}</div><button type="button" data-schedule-show-all>Show all fields</button></details><div class="schedule-summary"><div><small>Total shoot days</small><strong>${progress.total}</strong></div><div><small>Completed</small><strong>${progress.completed}</strong></div><div><small>Remaining</small><strong>${progress.remaining}</strong></div><div><small>Completion</small><strong>${progress.percentage}%</strong></div><div class="schedule-progress"><span>${progress.inProgress ? `${progress.inProgress} in progress · ` : ""}Progress</span><div role="progressbar" aria-valuenow="${progress.percentage}" aria-valuemin="0" aria-valuemax="100" aria-label="Completed shoot days"><i style="width:${progress.percentage}%"></i></div><small>Each Day label or date is counted once. A day completes when every entry is marked Completed.</small></div></div><div class="schedule-table-wrap"><table class="schedule-table"><thead><tr>${columns.map(label => `<th scope="col">${escapeHtml(label)}</th>`).join("")}<th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${items.length ? items.map(item => `<tr data-schedule-row="${escapeHtml(item.id)}">${visibleFields.map(field => `<td data-label="${escapeHtml(field.label)}">${cell(item, field)}</td>`).join("")}<td class="schedule-actions"><button type="button" data-schedule-delete="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.title)}">×</button></td></tr>`).join("") : `<tr><td class="schedule-empty-row" colspan="${columns.length + 1}">No shoot days yet. Add a schedule entry to begin planning.</td></tr>`}</tbody></table></div></div>`;
    };
    const wireScheduleBoard = () => {
      const chooser = editor.querySelector(".schedule-field-chooser");
      chooser?.insertAdjacentHTML("afterend", '<div class="studio-schedule-filters"><input type="search" id="schedule-search" placeholder="Search scenes, locations, cast…" aria-label="Search schedule"><select id="schedule-status-filter" aria-label="Filter schedule by status"><option value="">All statuses</option>' + scheduleChoices.status.map(value => '<option>' + value + '</option>').join('') + '</select><select id="schedule-priority-filter" aria-label="Filter schedule by priority"><option value="">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select></div>');
      const filterSchedule = () => {
        const query = editor.querySelector<HTMLInputElement>("#schedule-search")!.value.toLowerCase();
        const statusFilter = editor.querySelector<HTMLSelectElement>("#schedule-status-filter")!.value;
        const priority = editor.querySelector<HTMLSelectElement>("#schedule-priority-filter")!.value;
        editor.querySelectorAll<HTMLElement>("[data-schedule-row]").forEach(row => { const item = records.find(item => item.id === row.dataset.scheduleRow)!; row.hidden = ![item.title, ...Object.values(item.fields)].join(' ').toLowerCase().includes(query) || Boolean(statusFilter && item.fields.status !== statusFilter) || Boolean(priority && item.fields.priority !== priority); });
      };
      editor.querySelectorAll('.studio-schedule-filters input,.studio-schedule-filters select').forEach(control => control.addEventListener('input', filterSchedule));
      editor.querySelector<HTMLDetailsElement>(".schedule-field-chooser")?.addEventListener("toggle", event => { scheduleChooserOpen = (event.currentTarget as HTMLDetailsElement).open; });
      editor.querySelectorAll<HTMLInputElement>("[data-schedule-visible]").forEach(input => input.onchange = () => {
        if (!input.checked && scheduleVisible.size === 1) { input.checked = true; status.textContent = "Keep at least one schedule column visible."; return; }
        if (input.checked) scheduleVisible.add(input.dataset.scheduleVisible!); else scheduleVisible.delete(input.dataset.scheduleVisible!);
        localStorage.setItem(scheduleViewKey, JSON.stringify([...scheduleVisible]));
        scheduleChooserOpen = true; renderEditor();
      });
      editor.querySelector<HTMLButtonElement>("[data-schedule-show-all]")?.addEventListener("click", () => {
        scheduleVisible = new Set(fields.schedule.map(field => field.key));
        localStorage.removeItem(scheduleViewKey); scheduleChooserOpen = true; renderEditor();
      });
      const saveCell = (control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
        const item = records.find(candidate => candidate.id === control.dataset.recordId);
        const key = control.dataset.scheduleCell;
        if (!item || !key) return;
        item.fields[key] = control.value;
        item.updatedAt = new Date().toISOString();
        void persist(item).then(() => {
          if (!isCurrent()) return;
          const summary = editor.querySelector(".schedule-summary");
          const template = document.createElement("template");
          template.innerHTML = scheduleBoard();
          if (summary) summary.replaceWith(template.content.querySelector(".schedule-summary")!);
        }).catch(error => { status.textContent = error instanceof Error ? error.message : "Could not save schedule"; });
      };
      editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-schedule-cell]").forEach(control => {
        control.addEventListener(control instanceof HTMLSelectElement ? "change" : "input", () => saveCell(control));
      });
      editor.querySelectorAll<HTMLButtonElement>("[data-schedule-delete]").forEach(button => button.onclick = async () => {
        const item = records.find(candidate => candidate.id === button.dataset.scheduleDelete);
        if (!item || !confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
        await saveQueue;
        await deleteToolRecord(userId, project.id, tool, item.id);
        savedRevisions.delete(item.id); records = records.filter(candidate => candidate.id !== item.id);
        status.textContent = "Deleted from this device"; renderEditor();
      });
    };
    const visualBoard = () => {
      const visible = ordered().filter(item => activeScene === "all" || item.fields.sceneId === activeScene);
      const sceneLabel = (item: ToolRecord) => screenplayScenes.find(scene => scene.id === item.fields.sceneId)?.fields.text || "Ungrouped";
      const field = (item: ToolRecord, key: string, label: string, list = "") => key === "description" ? `<textarea rows="3" data-visual-field="description" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} ${label}">${escapeHtml(item.fields.description || "")}</textarea>` : `<input data-visual-field="${key}" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} ${label}" value="${escapeHtml(key === "title" ? item.title : item.fields[key] || "")}" ${list ? `list="${list}"` : ""}>`;
      const scene = (item: ToolRecord) => `<select data-visual-field="sceneId" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} Scene"><option value="">Ungrouped</option>${screenplayScenes.map(scene => `<option value="${escapeHtml(scene.id)}" ${item.fields.sceneId === scene.id ? "selected" : ""}>${escapeHtml(scene.fields.text || scene.title)}</option>`).join("")}</select>`;
      if (tool === "shots") return `<div class="shot-board"><datalist id="shot-size-options">${shotChoices.size.map(value => `<option value="${escapeHtml(value)}">`).join("")}</datalist><datalist id="shot-type-options">${shotChoices.type.map(value => `<option value="${escapeHtml(value)}">`).join("")}</datalist><datalist id="shot-movement-options">${shotChoices.movement.map(value => `<option value="${escapeHtml(value)}">`).join("")}</datalist><div class="visual-board-head"><strong>Shot list</strong><span>${visible.length} ${visible.length === 1 ? "shot" : "shots"} · edit directly in the grid</span></div><div class="shot-table-wrap"><table class="shot-table"><thead><tr><th>Image</th><th>Shot</th><th>Scene</th><th>Description</th><th>Shot size</th><th>Shot type</th><th>Movement</th><th>Est. time</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${visible.map((item, index) => `<tr data-visual-row="${escapeHtml(item.id)}"><td><label class="visual-image-cell">${safeImage(item.fields.image || "") ? `<img alt="Shot reference" src="${escapeHtml(safeImage(item.fields.image))}">` : '<span class="shot-image-placeholder">▧</span>'}<input type="file" accept="image/*" data-visual-image="${escapeHtml(item.id)}" aria-label="Upload image for shot ${index + 1}"></label></td><td><small>${index + 1}</small>${field(item, "title", "Shot title")}</td><td>${scene(item)}</td><td>${field(item, "description", "Description")}</td><td>${field(item, "size", "Shot size", "shot-size-options")}</td><td>${field(item, "type", "Shot type", "shot-type-options")}</td><td>${field(item, "movement", "Movement", "shot-movement-options")}</td><td>${field(item, "estimate", "Estimated time")}</td><td class="visual-delete"><button type="button" data-visual-delete="${escapeHtml(item.id)}" aria-label="Delete shot ${index + 1}">×</button></td></tr>`).join("") || '<tr><td colspan="9" class="visual-board-empty">No shots in this scene. Add one to begin.</td></tr>'}</tbody></table></div></div>`;
      if (tool === "storyboards") return `<div class="storyboard-board"><div class="visual-board-head"><strong>Storyboard</strong><span>${visible.length} ${visible.length === 1 ? "frame" : "frames"} · edit each panel directly</span></div><div class="storyboard-grid">${visible.map((item, index) => `<article class="storyboard-card" data-visual-row="${escapeHtml(item.id)}"><div class="storyboard-card-title">${scene(item)}<small>Frame ${index + 1}</small><button type="button" data-visual-delete="${escapeHtml(item.id)}" aria-label="Delete frame ${index + 1}">×</button></div><label class="storyboard-card-image">${safeImage(item.fields.image || "") ? `<img alt="Frame reference" src="${escapeHtml(safeImage(item.fields.image))}">` : '<span aria-hidden="true">▧</span>'}<input type="file" accept="image/*" data-visual-image="${escapeHtml(item.id)}" aria-label="Upload image for frame ${index + 1}"></label><label class="storyboard-inline-field"><span>Shot</span>${field(item, "title", "Shot title")}</label><label class="storyboard-inline-field"><span>Description</span><textarea rows="2" data-visual-field="description" data-record-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} Description">${escapeHtml(item.fields.description || "")}</textarea></label><label class="storyboard-inline-field"><span>Sound</span>${field(item, "sound", "Sound effects")}</label><label class="storyboard-inline-field"><span>Video reference</span>${field(item, "video", "Video reference")}</label></article>`).join("") || '<p class="visual-board-empty">No frames in this scene. Add one to begin.</p>'}</div></div>`;
      return "";
    };
    const wireVisualBoard = () => {
      const head = editor.querySelector<HTMLElement>(".visual-board-head");
      if (head) {
        head.innerHTML = `<div class="studio-visual-count"><strong>${records.length}</strong><span>${tool === "shots" ? "Total shots" : "Frames"}</span></div><div class="studio-visual-count"><strong>${new Set(records.map(item => item.fields.sceneId).filter(Boolean)).size}</strong><span>Scenes</span></div><label class="studio-scene-filter">Scene<select id="studio-scene-filter"><option value="all">All scenes</option>${screenplayScenes.map(scene => `<option value="${escapeHtml(scene.id)}" ${activeScene === scene.id ? "selected" : ""}>${escapeHtml(scene.fields.text || scene.title)}</option>`).join("")}</select></label><input id="studio-visual-search" type="search" placeholder="Search ${tool === "shots" ? "shots" : "frames"}…" aria-label="Search visual records" value="${escapeHtml(visualQuery)}">${tool === "storyboards" ? `<div class="studio-view-switch"><button type="button" data-board-view="grid" aria-pressed="${boardView === "grid"}">Grid</button><button type="button" data-board-view="list" aria-pressed="${boardView === "list"}">List</button></div>` : ""}`;
        head.querySelector<HTMLSelectElement>("#studio-scene-filter")!.onchange = event => { activeScene = (event.target as HTMLSelectElement).value; renderEditor(); };
        const search = head.querySelector<HTMLInputElement>("#studio-visual-search")!;
        const filter = () => editor.querySelectorAll<HTMLElement>("[data-visual-row]").forEach(row => {
          const item = records.find(item => item.id === row.dataset.visualRow)!;
          row.hidden = ![item.title, ...Object.entries(item.fields).filter(([key]) => key !== "image").map(([,value]) => value)].join(" ").toLowerCase().includes(visualQuery.toLowerCase());
        });
        search.oninput = () => { visualQuery = search.value; filter(); }; filter();
        head.querySelectorAll<HTMLButtonElement>("[data-board-view]").forEach(button => button.onclick = () => { boardView = button.dataset.boardView!; renderEditor(); });
      }
      editor.querySelector(".storyboard-grid")?.classList.toggle("studio-board-list", boardView === "list");
      // Real preset menus with an explicit custom value option.
      for (const key of ["size", "type", "movement"]) editor.querySelectorAll<HTMLInputElement>(`input[data-visual-field="${key}"]`).forEach(input => {
        const select = document.createElement("select"); select.setAttribute("aria-label", input.getAttribute("aria-label") || key);
        const options = [...shotChoices[key], ...(input.value && !shotChoices[key].includes(input.value) ? [input.value] : [])];
        select.innerHTML = '<option value="">Select…</option>' + options.map(value => `<option value="${escapeHtml(value)}" ${input.value === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("") + '<option value="__custom">Custom…</option>';
        input.hidden = true; input.before(select);
        select.onchange = () => { if (select.value === "__custom") { input.hidden = false; input.removeAttribute("list"); input.focus(); } else { input.hidden = true; input.value = select.value; input.dispatchEvent(new Event("input", { bubbles: true })); } };
      });
      editor.querySelectorAll<HTMLElement>(".storyboard-card").forEach(card => {
        const button = document.createElement("button"); button.type = "button"; button.className = "studio-inspect"; button.textContent = "Details";
        card.querySelector(".storyboard-card-title")?.append(button);
        button.onclick = () => { selected = card.dataset.visualRow; inspectorOpen = true; renderEditor(); };
      });
      if (tool === "storyboards" && inspectorOpen) {
        const item = records.find(item => item.id === selected);
        if (item) {
          const board = editor.querySelector<HTMLElement>(".storyboard-board")!;
          board.classList.add("studio-board-inspecting");
          board.insertAdjacentHTML("beforeend", `<aside class="studio-frame-inspector"><div><h3>Frame details</h3><button type="button" id="studio-close-inspector" aria-label="Close frame details">×</button></div>${safeImage(item.fields.image || "") ? `<img src="${escapeHtml(safeImage(item.fields.image))}" alt="Selected frame">` : ''}${["description", "sound", "video", "notes"].map(key => `<label>${key === 'sound' ? 'Sound effects' : key === 'video' ? 'Video reference' : key[0].toUpperCase() + key.slice(1)}<textarea data-visual-field="${key}" data-record-id="${escapeHtml(item.id)}" rows="3">${escapeHtml(item.fields[key] || '')}</textarea></label>`).join('')}<button type="button" data-frame-move="-1">← Move earlier</button><button type="button" data-frame-move="1">Move later →</button></aside>`);
          editor.querySelector<HTMLButtonElement>("#studio-close-inspector")!.onclick = () => { inspectorOpen = false; renderEditor(); };
          editor.querySelectorAll<HTMLButtonElement>("[data-frame-move]").forEach(button => button.onclick = async () => {
            const items = ordered(); const index = items.findIndex(row => row.id === item.id); const next = index + Number(button.dataset.frameMove);
            if (next < 0 || next >= items.length) return;
            [items[index], items[next]] = [items[next], items[index]];
            for (const [position, row] of items.entries()) { row.fields.order = String(position).padStart(6, "0"); await persist(row); }
            renderEditor();
          });
        }
      }
      editor.querySelectorAll<HTMLTableRowElement>(".shot-table tbody tr[data-visual-row]").forEach(row => row.querySelectorAll("td").forEach((cell, index) => { cell.dataset.label = ["Image", "Shot", "Scene", "Description", "Shot size", "Shot type", "Movement", "Est. time", "Actions"][index]; }));
      const saveVisual = (control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
        const item = records.find(candidate => candidate.id === control.dataset.recordId);
        const key = control.dataset.visualField;
        if (!item || !key) return;
        if (key === "title") item.title = control.value || "Untitled"; else item.fields[key] = control.value;
        item.updatedAt = new Date().toISOString();
        editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[data-visual-field="${key}"][data-record-id="${item.id}"]`).forEach(other => { if (other !== control) other.value = control.value; });
        void persist(item).catch(error => { status.textContent = error instanceof Error ? error.message : "Could not save item"; });
      };
      editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-visual-field]").forEach(control => control.addEventListener(control instanceof HTMLSelectElement ? "change" : "input", () => saveVisual(control)));
      editor.querySelectorAll<HTMLInputElement>("[data-visual-image]").forEach(input => input.onchange = async () => {
        const item = records.find(candidate => candidate.id === input.dataset.visualImage); const file = input.files?.[0];
        if (!item || !file) return;
        try { Object.assign(item.fields, await storeToolImage(userId, project.id, tool, item.id, await compressImage(file))); await persist(item); renderEditor(); }
        catch (error) { status.textContent = error instanceof Error ? error.message : "Could not save image"; }
      });
      editor.querySelectorAll<HTMLButtonElement>("[data-visual-delete]").forEach(button => button.onclick = async () => {
        const item = records.find(candidate => candidate.id === button.dataset.visualDelete);
        if (!item || !confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
        await saveQueue; await deleteToolRecord(userId, project.id, tool, item.id); savedRevisions.delete(item.id); records = records.filter(candidate => candidate.id !== item.id); renderList(); renderEditor();
      });
    };
    const calendarMarkup = () => {
      const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
      const moveLabel = calendarView === "month" ? calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : calendarView === "week" || calendarView === "timeline" ? `Week of ${new Date(year, month, calendarMonth.getDate() - calendarMonth.getDay()).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : calendarMonth.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const viewTabs = `<div class="calendar-view-tabs" role="group" aria-label="Calendar view">${(["timeline", "month", "week", "day"] as const).map(view => `<button type="button" data-calendar-view="${view}" aria-pressed="${calendarView === view}">${view[0].toUpperCase() + view.slice(1)}</button>`).join("")}</div>`;
      const boardHead = `<div class="calendar-board-head"><div><button type="button" data-calendar-month="-1" aria-label="Previous ${calendarView}">←</button><button type="button" data-calendar-today>Today</button><button type="button" data-calendar-month="1" aria-label="Next ${calendarView}">→</button></div><h2>${moveLabel}</h2>${viewTabs}</div>`;
      if (calendarView === "timeline") {
        const first = new Date(year, month, calendarMonth.getDate() - calendarMonth.getDay());
        const dates = Array.from({ length: 14 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
        const entries = ordered().filter(item => item.fields.date && item.fields.date >= localDateISO(dates[0]) && item.fields.date <= localDateISO(dates[13]));
        return `<div class="calendar-board">${boardHead}<div class="calendar-timeline-wrap"><div class="calendar-timeline"><div class="calendar-timeline-label">SCHEDULE</div>${dates.map(date => `<div class="calendar-timeline-date"><small>${date.toLocaleDateString(undefined, { weekday: "short" })}</small>${date.getDate()}</div>`).join("")}${entries.length ? entries.map(item => `<div class="calendar-timeline-label" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>${dates.map(date => `<div class="calendar-timeline-slot">${item.fields.date === localDateISO(date) ? `<button type="button" data-calendar-select="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.title)} on ${escapeHtml(item.fields.date)}">${escapeHtml(item.fields.time || "Shoot")}</button>` : ""}</div>`).join("")}`).join("") : `<div class="calendar-timeline-empty">No schedule entries in these two weeks. Add shoot days in Production Schedule.</div>`}</div></div></div>`;
      }
      if (calendarView !== "month") {
        const first = calendarView === "week" ? new Date(year, month, calendarMonth.getDate() - calendarMonth.getDay()) : new Date(year, month, calendarMonth.getDate());
        const dates = Array.from({ length: calendarView === "week" ? 7 : 1 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
        return `<div class="calendar-board">${boardHead}<div class="calendar-agenda">${dates.map(date => {
          const dayEntries = ordered().filter(item => item.fields.date === localDateISO(date));
          return `<section class="calendar-agenda-day"><h3><span>${date.toLocaleDateString(undefined, { weekday: "short" })}</span>${date.getDate()}</h3><div>${dayEntries.length ? dayEntries.map(item => `<button type="button" data-calendar-select="${escapeHtml(item.id)}"><time>${escapeHtml(item.fields.time || "Shoot day")}</time><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.fields.location || "Location not set")}</small></button>`).join("") : '<p>No scheduled entries</p>'}</div></section>`;
        }).join("")}</div></div>`;
      }
      const offset = new Date(year, month, 1).getDay();
      const count = new Date(year, month + 1, 0).getDate();
      const cells = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
        if (index < offset || index >= offset + count) return '<div class="calendar-cell muted"></div>';
        const day = index - offset + 1;
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const entries = ordered().filter(item => item.fields.date === date);
        return `<div class="calendar-cell"><strong>${day}</strong>${entries.map(item => `<button type="button" data-calendar-select="${item.id}">${escapeHtml(item.title)}<small>${escapeHtml(item.fields.time || "Shoot day")}</small><small>${escapeHtml(item.fields.location || "Location not set")}</small></button>`).join("")}</div>`;
      }).join("");
      return `<div class="calendar-board">${boardHead}<div class="calendar-grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<span class="calendar-day">${day}</span>`).join("")}${cells}</div></div>`;
    };
    const wireCalendar = () => {
      editor.querySelectorAll<HTMLButtonElement>("[data-calendar-month]").forEach(button => button.onclick = () => { const offset = Number(button.dataset.calendarMonth); calendarMonth = calendarView === "month" ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1) : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), calendarMonth.getDate() + offset * (calendarView === "day" ? 1 : calendarView === "timeline" ? 14 : 7)); renderEditor(); });
      editor.querySelector<HTMLButtonElement>("[data-calendar-today]")?.addEventListener("click", () => { calendarMonth = new Date(); renderEditor(); });
      editor.querySelectorAll<HTMLButtonElement>("[data-calendar-view]").forEach(button => button.onclick = () => { calendarView = button.dataset.calendarView as typeof calendarView; renderEditor(); });
      editor.querySelectorAll<HTMLButtonElement>("[data-calendar-select]").forEach(button => button.onclick = () => { selected = button.dataset.calendarSelect; renderList(); renderEditor(); });
    };
    if (!record) {
      if (tool === "schedule" && name !== "calendar") {
        editor.innerHTML = scheduleBoard();
        wireScheduleBoard();
        return;
      }
      if (tool === "shots" || tool === "storyboards") {
        editor.innerHTML = visualBoard();
        wireVisualBoard();
        return;
      }
      editor.innerHTML = tool === "screenplay" ? `<div class="script-empty-desk"><div class="script-page script-empty-page"><div class="script-page-header"><span>${escapeHtml(project.title)}</span><span>Script draft</span></div><div class="script-empty-invitation"><h2>Start your screenplay</h2><p>Add a scene heading, then build your story one element at a time.</p><button type="button" id="script-start">Add first scene</button></div></div></div>` : `${name === "calendar" ? calendarMarkup() : ""}<div class="tool-empty-state"><span>${tool === "locations" ? "⌖" : tool === "call-sheets" ? "▣" : tool === "notes" ? "▤" : "✦"}</span><h2>${name === "calendar" ? "No shoot days yet." : tool === "locations" ? "Map out your locations" : tool === "call-sheets" ? "Prepare your first call sheet" : tool === "notes" ? "Your documents start here" : "Start with an idea."}</h2><p>${name === "calendar" ? "Add entries in the Schedule tab." : tool === "locations" ? "Record addresses, contacts, permits and access notes." : tool === "call-sheets" ? "Create a daily plan from your schedule." : tool === "notes" ? "Create a document, give it a name and begin writing." : "Create an item to begin."}</p>${name !== "calendar" ? `<button type="button" id="empty-tool-add">＋ ${tool === "notes" ? "New document" : tool === "locations" ? "New location" : tool === "call-sheets" ? "New call sheet" : "Add first item"}</button>` : ""}</div>`;
      editor.querySelector("#script-start")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
      editor.querySelector("#empty-tool-add")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
      wireVisualBoard();
      wireScheduleBoard();
      wireCalendar(); return;
    }
    if (tool === "schedule" && name !== "calendar") {
      editor.innerHTML = scheduleBoard();
      wireScheduleBoard();
      return;
    }
    const hasVisualBoard = ["shots", "storyboards"].includes(tool);
    if (hasVisualBoard) {
      editor.innerHTML = visualBoard();
      wireVisualBoard();
      return;
    }
    const dataFields = fields[tool].filter(field => (name !== "calendar" || ["date", "location", "scenes", "status"].includes(field.key)) && !(tool === "shots" && field.key === "scene") && !(tool === "storyboards" && field.key === "shot") && !(tool === "schedule" && name !== "calendar" && !scheduleVisible.has(field.key)));
    const valueFor = (key: string) => record.fields[key] || (tool === "schedule" ? ({
      time: [record.fields.start, record.fields.end].filter(Boolean).join("–"),
      sceneNumbers: record.fields.scene,
      characters: record.fields.cast,
      propsRequired: record.fields.props,
      costumes: record.fields.wardrobe,
      equipmentRequired: record.fields.equipment,
    } as Record<string, string | undefined>)[key] || "" : "");
    const snapshot = tool === "call-sheets" && record.fields.published === "true";
    const isScript = tool === "screenplay";
    editor.innerHTML = isScript ? screenplayEditorMarkup(project, record, ordered()) : `${name === "calendar" ? calendarMarkup() : ""}<form id="tool-form" class="tool-form"><div class="tool-form-header"><label class="tool-title-label">${isScript ? "Element title" : tool === "schedule" ? "Schedule item" : "Title"}<input name="title" value="${escapeHtml(record.title)}" maxlength="160" ${snapshot ? "readonly" : ""} required></label><div class="tool-form-actions">${tool === "call-sheets" && !snapshot ? '<button type="button" id="tool-publish">Publish version</button>' : ""}${(isScript || tool === "shots" || tool === "storyboards") && !snapshot ? '<button type="button" id="tool-up" aria-label="Move item up">↑</button><button type="button" id="tool-down" aria-label="Move item down">↓</button>' : ""}<button type="button" id="tool-print">Print / PDF</button>${name !== "calendar" ? '<button type="button" id="tool-remove" class="danger-text">Delete</button>' : ""}</div></div>${snapshot ? '<p class="tool-published">Published snapshot · This version is read only.</p>' : ""}<div class="tool-fields">${dataFields.map(field => `<label>${escapeHtml(field.label)}${field.key === "kind" ? `<select name="kind">${screenplayKinds.map(kind => `<option value="${escapeHtml(kind)}" ${record.fields.kind === kind ? "selected" : ""}>${escapeHtml(kind)}</option>`).join("")}</select>` : ["text", "body", "description", "notes", "schedule"].includes(field.key) ? `<textarea name="${field.key}" rows="${field.key === "text" || field.key === "body" ? 13 : 4}" ${snapshot ? "readonly" : ""}>${escapeHtml(valueFor(field.key))}</textarea>` : `<input name="${field.key}" type="${field.type || "text"}" value="${escapeHtml(valueFor(field.key))}" ${snapshot ? "readonly" : ""}>`}</label>`).join("")}</div>${isScript ? '<p class="script-shortcuts">Format element: Ctrl+1–9, or Alt+Shift+1–9 if your browser uses Ctrl+number. The menu above works on touch devices.</p>' : ""}${(tool === "shots" || tool === "storyboards") ? `<div class="tool-image-upload"><label>Upload reference image <input id="tool-image-file" type="file" accept="image/*"></label>${safeImage(record.fields.image || "") ? `<img alt="Reference image" src="${escapeHtml(safeImage(record.fields.image))}">` : ""}</div>` : ""}${isScript ? '<section class="tool-comments"><h2>Comments</h2><label>Comment on selected script text<textarea id="tool-comment-body" rows="2" placeholder="Leave a note for your crew"></textarea></label><button type="button" id="tool-comment-add">Add comment</button><div id="tool-comment-list"></div></section>' : ""}</form>`;
    if (["notes", "locations", "call-sheets"].includes(tool)) editor.innerHTML = studioDocument(tool, record, project.title);
    editor.querySelector("#studio-duplicate")?.addEventListener("click", async () => {
      const copy = newToolRecord(record.title + " — revision", { ...record.fields, published: "false", publishedAt: "" });
      records.push(copy); selected = copy.id; await persist(copy); renderList(); renderEditor();
    });
    if (tool === "shots" || tool === "storyboards") {
      editor.insertAdjacentHTML("afterbegin", visualBoard());
      const fieldGrid = editor.querySelector<HTMLElement>(".tool-fields")!;
      const sceneField = document.createElement("label");
      sceneField.innerHTML = `Scene<select name="sceneId"><option value="">Ungrouped</option>${screenplayScenes.map(scene => `<option value="${escapeHtml(scene.id)}" ${record.fields.sceneId === scene.id ? "selected" : ""}>${escapeHtml(scene.fields.text || scene.title)}</option>`).join("")}</select>`;
      fieldGrid.prepend(sceneField);
      if (tool === "storyboards") {
        const shotField = document.createElement("label");
        shotField.innerHTML = `Linked shot<select name="shotId"><option value="">No linked shot</option>${projectShots.map(shot => `<option value="${escapeHtml(shot.id)}" ${record.fields.shotId === shot.id ? "selected" : ""}>${escapeHtml(shot.title)}${shot.fields.description ? ` — ${escapeHtml(shot.fields.description.slice(0, 50))}` : ""}</option>`).join("")}</select>`;
        sceneField.after(shotField);
      }
      if (tool === "shots") for (const key of ["size", "type", "movement"]) {
        const input = fieldGrid.querySelector<HTMLInputElement>(`input[name="${key}"]`);
        if (input) input.closest("label")!.outerHTML = shotChoice(key, record.fields[key] || "");
      }
      wireVisualBoard();
    }
    wireCalendar();
    const form = editor.querySelector<HTMLFormElement>("#tool-form")!;
    if (tool === "screenplay") {
      const navigator = form.querySelector<HTMLButtonElement>("#script-navigator-toggle")!;
      navigator.onclick = () => {
        const open = !workspace.classList.contains("scene-navigator-open");
        setSceneNavigator(open);
      };
      setSceneNavigator(localStorage.getItem(sceneNavigatorKey) !== "false");
    }
    if (tool === "notes") mountNoteEditor(form, record.fields.richBody);
    if (tool === "shots") form.querySelectorAll<HTMLSelectElement>("[data-shot-choice]").forEach(choice => choice.addEventListener("change", () => {
      const key = choice.dataset.shotChoice!;
      const input = form.querySelector<HTMLInputElement>(`input[name="${key}"]`)!;
      input.hidden = choice.value !== "custom";
      input.value = choice.value === "custom" ? (shotChoices[key].includes(input.value) ? "" : input.value) : choice.value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      if (choice.value === "custom") input.focus();
    }));
    if (tool === "screenplay") editor.querySelectorAll<HTMLButtonElement>("[data-script-select]").forEach(button => button.onclick = () => { selected = button.dataset.scriptSelect; revealSelected = true; renderList(); renderEditor(); });
    if (!snapshot) form.addEventListener("input", event => {
      const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      if ((tool === "shots" || tool === "storyboards") && !values.image && record.fields.image?.startsWith("data:image/")) delete values.image;
      record.title = tool === "screenplay" ? (values.text || "").split("\n")[0].trim().slice(0, 80) || "Untitled element" : values.title || "Untitled";
      if (tool === "screenplay" && values.text !== record.fields.text) {
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        record.fields.comments = JSON.stringify(comments.map(comment => remapTextComment(comment, record.fields.text || "", values.text || "")));
      }
      record.fields = { ...record.fields, ...values };
      record.updatedAt = new Date().toISOString();
      const isScriptTextInput = tool === "screenplay" && event.target instanceof HTMLTextAreaElement && event.target.name === "text";
      if (isScriptTextInput) {
        if (screenplaySaveTimer) clearTimeout(screenplaySaveTimer);
        screenplaySaveTimer = setTimeout(() => {
          screenplaySaveTimer = undefined;
          renderList();
          void persist(record).catch(error => { status.textContent = `Save failed: ${error.message}`; });
        }, 550);
        status.textContent = "Saving…";
        return;
      }
      renderList();
      if (name === "calendar") { const board = editor.querySelector(".calendar-board"); if (board) { board.outerHTML = calendarMarkup(); wireCalendar(); } }
      void persist(record).catch(error => { status.textContent = `Save failed: ${error.message}`; });
    });
    editor.querySelector("#tool-remove")?.addEventListener("click", async () => {
      if (!confirm(`Delete “${record.title}”? This cannot be undone.`)) return;
      await saveQueue; await deleteToolRecord(userId, project.id, tool, record.id);
      savedRevisions.delete(record.id); records = records.filter(item => item.id !== record.id); selected = ordered()[0]?.id;
      status.textContent = "Deleted from this device"; renderList(); renderEditor();
    });
    editor.querySelector("#tool-print")?.addEventListener("click", () => {
      const paper = document.querySelector<HTMLElement>("#tool-print-document")!;
      if (tool === "screenplay") paper.innerHTML = `<h1>${escapeHtml(project.title)}</h1>${ordered().map(item => `<p class="script-print-${(item.fields.kind || "Text").toLowerCase().replaceAll(" ", "-")}">${escapeHtml(item.fields.text || "")}</p>`).join("")}`;
      else paper.innerHTML = `<h1>${escapeHtml(project.title)}</h1><h2>${escapeHtml(record.title)}</h2>${Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[name]")).filter(input => input.name !== "title" && input.name !== "richBody").map(input => `<section><h2>${escapeHtml(input.closest("label")?.querySelector("span")?.textContent || input.name)}</h2><p>${escapeHtml(input.value || "—")}</p></section>`).join("")}`;
      print();
    });
    for (const [direction, offset] of [["up", -1], ["down", 1]] as const) editor.querySelector(`#tool-${direction}`)?.addEventListener("click", async () => {
      const items = ordered(); const index = items.findIndex(item => item.id === record.id); const other = items[index + offset];
      if (!other) return;
      items.forEach((item, position) => { item.fields.order = String(position).padStart(6, "0"); });
      const currentOrder = record.fields.order; record.fields.order = other.fields.order; other.fields.order = currentOrder;
      await Promise.all([persist(record), persist(other)]); renderList();
    });
    editor.querySelector<HTMLInputElement>("#tool-image-file")?.addEventListener("change", async event => {
      const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
      try { Object.assign(record.fields, await storeToolImage(userId, project.id, tool, record.id, await compressImage(file))); await persist(record); renderEditor(); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "Could not save image"; }
    });
    editor.querySelector("#tool-publish")?.addEventListener("click", async () => {
      if (!confirm("Publish this call sheet as a read-only snapshot?")) return;
      record.fields.published = "true"; record.fields.publishedAt = new Date().toISOString();
      await persist(record); renderEditor();
    });
    if (tool === "screenplay") {
      const area = form.querySelector<HTMLTextAreaElement>('textarea[name="text"]')!;
      flushScreenplaySave = () => {
        if (!screenplaySaveTimer) return;
        clearTimeout(screenplaySaveTimer);
        screenplaySaveTimer = undefined;
        renderList();
        void persist(record).catch(error => { status.textContent = `Save failed: ${error.message}`; });
      };
      const moveCursorTo = (offset: -1 | 1) => {
        flushScreenplaySave();
        const items = ordered();
        const index = items.findIndex(item => item.id === record.id);
        const next = items[index + offset];
        if (!next) return false;
        selected = next.id;
        revealSelected = true;
        renderList();
        renderEditor();
        requestAnimationFrame(() => {
          const nextArea = editor.querySelector<HTMLTextAreaElement>('textarea[name="text"]');
          if (!nextArea) return;
          nextArea.focus();
          const position = offset < 0 ? nextArea.value.length : 0;
          nextArea.setSelectionRange(position, position);
        });
        return true;
      };
      form.querySelector<HTMLSelectElement>('select[name="kind"]')!.addEventListener("input", event => {
        const kind = (event.currentTarget as HTMLSelectElement).value;
        const block = form.querySelector<HTMLElement>(".script-block-active")!;
        block.className = `script-block script-block-active script-${kind.toLowerCase().replaceAll(" ", "-")}`;
        block.querySelector<HTMLElement>(".script-block-kind")!.textContent = kind;
      });
      const sizeScriptInput = () => { area.style.height = "0px"; area.style.height = `${Math.max(48, area.scrollHeight)}px`; };
      sizeScriptInput();
      area.addEventListener("input", sizeScriptInput);
      area.addEventListener("blur", flushScreenplaySave);
      const suggestions = form.querySelector<HTMLElement>("#script-suggestions")!;
      let suggestionValues: string[] = [];
      let activeSuggestion = 0;
      const hideSuggestions = () => { suggestions.hidden = true; suggestionValues = []; activeSuggestion = 0; };
      const applySuggestion = (value: string) => {
        area.value = value;
        area.dispatchEvent(new Event("input", { bubbles: true }));
        area.setSelectionRange(area.value.length, area.value.length);
        hideSuggestions();
      };
      const showSuggestions = () => {
        const kind = form.querySelector<HTMLSelectElement>('select[name="kind"]')!.value;
        suggestionValues = kind === "Character" ? characterSuggestions(records, area.value) : kind === "Scene Heading" ? sceneHeadingSuggestions(records, area.value) : [];
        if (!suggestionValues.length || (suggestionValues.length === 1 && suggestionValues[0] === area.value.trim().toLocaleUpperCase())) { hideSuggestions(); return; }
        suggestions.innerHTML = suggestionValues.map((value, index) => `<button type="button" role="option" aria-selected="${index === activeSuggestion}" data-script-suggestion="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
        suggestions.hidden = false;
        suggestions.querySelectorAll<HTMLButtonElement>("[data-script-suggestion]").forEach(button => button.onclick = () => applySuggestion(button.dataset.scriptSuggestion || ""));
      };
      area.addEventListener("input", showSuggestions);
      const createNextBlock = async (kind = nextScreenplayKind(form.querySelector<HTMLSelectElement>('select[name="kind"]')!.value, !area.value.trim())) => {
        flushScreenplaySave();
        const next = newToolRecord("Untitled element", { kind, text: "" });
        next.fields.order = String(records.length).padStart(6, "0");
        records.push(next);
        selected = next.id;
        revealSelected = true;
        await persist(next);
        renderList();
        renderEditor();
      };
      area.addEventListener("keydown", event => {
        if (!suggestions.hidden && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault(); activeSuggestion = (activeSuggestion + (event.key === "ArrowDown" ? 1 : suggestionValues.length - 1)) % suggestionValues.length; showSuggestions(); return;
        }
        if (!suggestions.hidden && (event.key === "Escape" || event.key === "Enter" || event.key === "Tab")) {
          if (event.key !== "Escape") { event.preventDefault(); applySuggestion(suggestionValues[activeSuggestion]); }
          else hideSuggestions();
          return;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          void createNextBlock();
          return;
        }
        const atStart = area.selectionStart === 0 && area.selectionEnd === 0;
        const atEnd = area.selectionStart === area.value.length && area.selectionEnd === area.value.length;
        if (event.key === "ArrowUp" && atStart && moveCursorTo(-1)) event.preventDefault();
        if (event.key === "ArrowDown" && atEnd && moveCursorTo(1)) event.preventDefault();
      });
      const selectionAction = form.querySelector<HTMLButtonElement>("#script-comment-open")!;
      const composer = form.querySelector<HTMLElement>("#script-comment-composer")!;
      const panel = form.querySelector<HTMLElement>("#script-comments-panel")!;
      const toggle = form.querySelector<HTMLButtonElement>("#script-comments-toggle")!;
      let selectedPassage: { from: number; to: number; quote: string } | null = null;
      const showSelectionAction = () => {
        const { selectionStart: from, selectionEnd: to } = area;
        selectedPassage = document.activeElement === area && from < to ? { from, to, quote: area.value.slice(from, to) } : null;
        selectionAction.hidden = !selectedPassage;
      };
      for (const eventName of ["select", "mouseup", "keyup"]) area.addEventListener(eventName, showSelectionAction);
      area.addEventListener("input", () => { selectedPassage = null; selectionAction.hidden = true; showComments(); });
      toggle.onclick = () => { panel.hidden = !panel.hidden; toggle.setAttribute("aria-expanded", String(!panel.hidden)); };
      form.querySelector<HTMLButtonElement>("#script-comments-close")!.onclick = () => { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); };
      selectionAction.onclick = () => {
        if (!selectedPassage) return;
        form.querySelector<HTMLElement>("#script-selected-quote")!.textContent = selectedPassage.quote;
        composer.hidden = false;
        selectionAction.hidden = true;
        form.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.focus();
      };
      form.querySelector<HTMLButtonElement>("#script-comment-cancel")!.onclick = () => { composer.hidden = true; selectedPassage = null; };
      const showComments = () => {
        const comments = ordered().flatMap(block => (JSON.parse(block.fields.comments || "[]") as TextComment[]).map(comment => ({ ...comment, blockId: comment.blockId || block.id })));
        const target = editor.querySelector<HTMLElement>("#tool-comment-list")!;
        target.innerHTML = comments.length ? comments.map(comment => `<article class="tool-comment ${comment.orphaned ? "orphaned" : ""} ${comment.resolved ? "resolved" : ""}" data-comment-thread="${escapeHtml(comment.id)}"><small>${comment.orphaned ? "Orphaned anchor" : escapeHtml(comment.quote)}</small><p>${escapeHtml(comment.body)}</p>${comment.replies?.map(reply => `<p class="tool-comment-reply">${escapeHtml(reply.body)}</p>`).join("") || ""}<button type="button" data-comment-focus="${escapeHtml(comment.id)}">Go to text</button><button type="button" data-comment="${escapeHtml(comment.id)}" data-comment-block="${escapeHtml(comment.blockId!)}">${comment.resolved ? "Reopen" : "Resolve"}</button></article>`).join("") : '<p class="tool-empty">No comments yet.</p>';
        target.querySelectorAll<HTMLButtonElement>("[data-comment-focus]").forEach(button => button.onclick = () => { const comment = comments.find(item => item.id === button.dataset.commentFocus); if (!comment) return; selected = comment.blockId; revealSelected = true; renderList(); renderEditor(); });
        target.querySelectorAll<HTMLButtonElement>("[data-comment]").forEach(button => button.onclick = () => {
          const block = records.find(item => item.id === button.dataset.commentBlock); if (!block) return;
          const blockComments = JSON.parse(block.fields.comments || "[]") as TextComment[];
          const comment = blockComments.find(item => item.id === button.dataset.comment)!; comment.resolved = !comment.resolved; block.fields.comments = JSON.stringify(blockComments); void persist(block); showComments();
        });
      };
      showComments();
      editor.querySelector("#tool-comment-add")?.addEventListener("click", async () => {
        if (!selectedPassage) { status.textContent = "Select script text before adding a comment."; area.focus(); return; }
        const body = editor.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.value.trim();
        if (!body) { status.textContent = "Write a comment first."; return; }
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        comments.push({ id: crypto.randomUUID(), blockId: record.id, ...selectedPassage, body, orphaned: false, resolved: false, replies: [] });
        record.fields.comments = JSON.stringify(comments); await persist(record);
        editor.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.value = ""; composer.hidden = true; selectedPassage = null; panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); showComments();
      });
      if (revealSelected) {
        revealSelected = false;
        requestAnimationFrame(() => editor.querySelector<HTMLElement>(`[data-script-id="${CSS.escape(record.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    }
    if (tool === "screenplay") form.addEventListener("keydown", event => {
      if (event.key === "Tab" && event.target instanceof HTMLTextAreaElement && event.target.name === "text" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault(); const select = form.querySelector<HTMLSelectElement>('select[name="kind"]')!; const index = screenplayKinds.indexOf(select.value as typeof screenplayKinds[number]); select.value = screenplayKinds[(index + (event.shiftKey ? 8 : 1)) % 9]; select.dispatchEvent(new Event("input", { bubbles: true })); return;
      }
      if (!((event.ctrlKey && !event.altKey && !event.metaKey) || (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey))) return;
      const digit = event.code.match(/^Digit([0-8])$/)?.[1] ?? (/^[0-8]$/.test(event.key) ? event.key : undefined);
      if (digit === undefined) return;
      const shortcutKinds: Record<string, ScreenplayKind> = { "1": "Scene Heading", "2": "Action", "3": "Character", "4": "Dialogue", "5": "Parenthetical", "6": "Transition", "7": "Shot" };
      const kind = event.ctrlKey ? shortcutKinds[digit] : screenplayKinds[Number(digit)];
      if (!kind) return;
      event.preventDefault(); const select = form.querySelector<HTMLSelectElement>('select[name="kind"]')!;
      select.value = kind; select.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  renderList(); renderEditor();
  status.textContent = userId === "local-demo-owner" ? "Saved in this browser" : "Synced to project cloud";
  if (userId !== "local-demo-owner" && userId !== "anonymous") {
    void import("./cloud.js").then(({ supabase }) => {
      activeToolChannel?.unsubscribe();
      activeToolChannel = supabase.channel(`project-tools:${project.id}:${tool}`).on("postgres_changes", { event: "*", schema: "public", table: "project_tool_records", filter: `project_id=eq.${project.id}` }, async payload => {
        const changed = (payload.new as { tool?: string } | undefined)?.tool || (payload.old as { tool?: string } | undefined)?.tool;
        if (changed !== tool || !isCurrent()) return;
        records = await toolRecords(userId, project.id, tool);
        savedRevisions.clear(); records.forEach(item => savedRevisions.set(item.id, item.revision || 0));
        if (!selected || !records.some(item => item.id === selected)) selected = records[0]?.id;
        renderList(); renderEditor(); status.textContent = "Updated by a collaborator";
      }).subscribe();
    });
  }
  document.querySelector<HTMLButtonElement>("#schedule-columns")?.addEventListener("click", () => {
    scheduleChooserOpen = true;
    renderEditor();
    requestAnimationFrame(() => editor.querySelector<HTMLElement>(".schedule-field-chooser")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
  document.querySelector("#tool-add")?.addEventListener("click", async () => {
    if (!premium && (tool === "shots" || tool === "storyboards") && records.length >= 50) { status.textContent = "The Free plan allows 50 active shots and 50 storyboard frames."; return; }
    const prior = records.find(item => item.id === selected);
    const nextKind = records.length === 0 ? "Scene Heading" : prior?.fields.kind === "Character" ? "Dialogue" : "Action";
    const nextDay = String(Math.max(0, ...records.map(item => Number(item.fields.day) || 0)) + 1);
    const defaults: Record<string, string> = tool === "screenplay" ? { kind: nextKind, text: "" } : tool === "schedule" ? { day: nextDay, date: localDateISO(new Date()), priority: "Medium", status: "Not Started", postStatus: "Pending" } : tool === "shots" || tool === "storyboards" ? { sceneId: activeScene === "all" ? "" : activeScene } : {};
    const documentName = tool === "notes" ? prompt("Name your new document") : null;
    if (tool === "notes" && documentName === null) return;
    if (tool === "notes" && !documentName?.trim()) { status.textContent = "Enter a document name to begin."; return; }
    const title = tool === "screenplay" ? "Untitled element" : tool === "notes" ? documentName!.trim() : tool === "shots" ? "New shot" : tool === "storyboards" ? "New frame" : tool === "schedule" ? "New schedule item" : tool === "locations" ? "New location" : "Call sheet draft";
    const record = newToolRecord(title, defaults);
    record.fields.order = String(records.length).padStart(6, "0");
    if (tool === "call-sheets") {
      const schedule = await toolRecords(userId, project.id, "schedule");
      record.fields.schedule = schedule.map(item => `${item.fields.date || ""} ${item.fields.time || item.fields.start || ""} ${item.title} — ${item.fields.location || ""}`).join("\n");
    }
    records.push(record); selected = record.id; await persist(record); renderList(); renderEditor();
    if (tool === "screenplay") editor.querySelector<HTMLTextAreaElement>('textarea[name="text"]')?.focus();
    else if (tool === "notes") editor.querySelector<HTMLElement>('.ProseMirror')?.focus();
    else if (tool === "schedule") editor.querySelector<HTMLInputElement>(`[data-schedule-cell="day"][data-record-id="${record.id}"]`)?.focus();
    else if (tool === "shots" || tool === "storyboards") editor.querySelector<HTMLInputElement>(`[data-visual-field="title"][data-record-id="${record.id}"]`)?.focus();
    else editor.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  });
}
