import { mountNoteEditor } from "./note-editor.js";
import { studioDocument } from "./studio-documents.js";
import { studioShell } from "./studio-shell.js";
import { findScriptText, orderBetween, revisionSceneLabels, sceneIdAt, snapshotScript, wordCount, type ScriptSnapshot } from "./screenplay-engine.js";
import type { Project } from "./domain.js";
import { deleteToolRecord, newToolRecord, saveToolRecord, storeToolImage, toolRecords, type ToolName, type ToolRecord } from "./tool-data.js";

let activeToolChannel: { unsubscribe: () => unknown } | null = null;
let activeSceneScrollCleanup: (() => void) | null = null;
let activePageResizeCleanup: (() => void) | null = null;

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
export type ScreenplayScene = { id: string; number: number; displayNumber: string; heading: string; startBlockId: string; endBlockId: string };
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
export function deriveScreenplayScenes(records: ToolRecord[], revisionMode = false): ScreenplayScene[] {
  const ordered = [...records].sort((a, b) => (a.fields.order || a.createdAt).localeCompare(b.fields.order || b.createdAt));
  const headings = ordered.map((record, index) => ({ record, index })).filter(({ record }) => record.fields.kind === "Scene Heading");
  const labels = revisionMode ? revisionSceneLabels(headings.map(item => item.record)) : headings.map((_, index) => String(index + 1));
  return headings.map(({ record, index }, sceneIndex) => ({ id: record.id, number: sceneIndex + 1, displayNumber: `${labels[sceneIndex]}${record.fields.omitted === "true" ? " OMITTED" : ""}`, heading: (record.fields.text || record.title || "Untitled scene").split("\n")[0], startBlockId: record.id, endBlockId: headings[sceneIndex + 1] ? ordered[headings[sceneIndex + 1].index - 1].id : ordered.at(-1)?.id || record.id }));
}
export function characterSuggestions(records: ToolRecord[], query: string): string[] {
  const key = query.trim().toLocaleUpperCase();
  return [...new Set(records.filter(record => record.fields.kind === "Character").map(record => record.fields.text.trim().toLocaleUpperCase()).filter(Boolean))].filter(name => !key || name.includes(key)).sort((a, b) => a.localeCompare(b));
}
export function sceneHeadingSuggestions(records: ToolRecord[], query: string): string[] {
  const key = query.trim().toLocaleUpperCase();
  const defaults = ["INT.", "EXT.", "INT./EXT."];
  const existing = records.filter(record => record.fields.kind === "Scene Heading").map(record => record.fields.text.trim().toLocaleUpperCase()).filter(Boolean);
  const locationPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.)\s+(.+)$/u.exec(key);
  if (locationPrefix) {
    const locations = existing.map(value => value.replace(/^(INT\.|EXT\.|INT\.\/EXT\.)\s+/u, "")).filter(value => value.startsWith(locationPrefix[2]));
    const times = ["DAY", "NIGHT", "MORNING", "EVENING", "AFTERNOON", "CONTINUOUS"];
    const timeChoices = key.includes(" - ") ? times.filter(time => time.startsWith(key.split(" - ").at(-1)!)).map(time => `${key.slice(0, key.lastIndexOf(" - "))} - ${time}`) : [];
    return [...new Set([...locations.map(location => `${locationPrefix[1]} ${location}`), ...timeChoices, ...existing.filter(value => value.startsWith(key))])].slice(0, 6);
  }
  return [...new Set([...defaults, ...existing])].filter(value => !key || value.includes(key)).slice(0, 6);
}
export const localDateISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
type TextComment = { id: string; blockId?: string; from: number; to: number; quote: string; body: string; author?: string; createdAt?: string; orphaned: boolean; resolved: boolean; replies?: { id: string; body: string; author?: string; createdAt: string }[] };
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

function screenplayEditorMarkup(project: Project, selected: ToolRecord, items: ToolRecord[], revisionMode = false): string {
  const scenes = deriveScreenplayScenes(items, revisionMode);
  const sceneLabels = new Map(scenes.map(scene => [scene.id, scene.displayNumber]));
  const annotated = (item: ToolRecord) => {
    const value = item.fields.text || " ";
    let comments: TextComment[] = [];
    try { comments = JSON.parse(item.fields.comments || "[]") as TextComment[]; } catch { /* Ignore malformed legacy annotations. */ }
    const ranges = comments.filter(comment => !comment.orphaned && comment.from >= 0 && comment.to <= value.length && comment.from < comment.to).sort((a,b) => a.from - b.from);
    let cursor = 0;
    let html = "";
    for (const range of ranges) {
      if (range.from < cursor) continue;
      html += escapeHtml(value.slice(cursor, range.from));
      html += `<mark class="script-comment-mark" data-comment-id="${escapeHtml(range.id)}">${escapeHtml(value.slice(range.from, range.to))}</mark>`;
      cursor = range.to;
    }
    return html + escapeHtml(value.slice(cursor));
  };
  const element = (item: ToolRecord) => {
    const kind = screenplayKinds.includes(item.fields.kind as typeof screenplayKinds[number]) ? item.fields.kind : "Text";
    const kindClass = kind.toLowerCase().replaceAll(" ", "-");
    const number = kind === "Scene Heading" ? `<span class="script-scene-number" aria-label="Scene ${escapeHtml(sceneLabels.get(item.id) || "")}">${escapeHtml(sceneLabels.get(item.id) || "")}</span>` : "";
    if (item.id !== selected.id) return `<button type="button" class="script-block script-block-preview script-${kindClass}" data-script-id="${escapeHtml(item.id)}" data-script-select="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(kind)} element">${number}<span class="script-block-text">${annotated(item)}</span></button>`;
    return `<div class="script-block script-block-active script-${kindClass} ${item.fields.comments && item.fields.comments !== "[]" ? "script-block-commented" : ""}" data-script-id="${escapeHtml(item.id)}">${number}<textarea name="text" aria-label="Script text" placeholder=" " dir="auto" rows="${Math.max(1, Math.min(12, (item.fields.text || "").split("\n").length))}" spellcheck="${kind === "Character" || kind === "Scene Heading" ? "false" : "true"}">${escapeHtml(item.fields.text || "")}</textarea><div class="script-suggestions" id="script-suggestions" role="listbox" hidden></div><button type="button" class="script-selection-action" id="script-comment-open" aria-label="Add comment to selected text" hidden>Add comment</button></div>`;
  };
  const pageMarkup = `<article class="script-page" aria-label="Screenplay page 1"><div class="script-page-header"><span>1</span></div><div class="script-page-content">${items.map(element).join("")}</div></article>`;
  return `<form id="tool-form" class="script-editor-form"><div class="script-toolbar"><div class="script-toolbar-main"><label class="script-kind-label">Element <select name="kind">${screenplayKinds.map((kind, index) => `<option value="${escapeHtml(kind)}" ${selected.fields.kind === kind ? "selected" : ""}>${escapeHtml(kind)} — Ctrl+${index}</option>`).join("")}</select></label><span class="script-shortcuts">Tab changes element · Ctrl+0–8 selects a block type</span></div><div class="script-toolbar-actions"><button type="button" id="script-navigator-toggle" aria-expanded="false" aria-controls="tool-list">Scenes</button><button type="button" id="tool-up" aria-label="Move element up">↑</button><button type="button" id="tool-down" aria-label="Move element down">↓</button><button type="button" id="script-comments-toggle" aria-expanded="false" aria-controls="script-comments-panel">Comments</button><button type="button" id="tool-print">Export PDF</button></div></div><input type="hidden" name="title" value="${escapeHtml(selected.title)}"><div class="script-layout"><div class="script-pages">${pageMarkup}</div><aside class="tool-comments script-comments" id="script-comments-panel" aria-label="Screenplay comments" hidden><div class="script-comments-head"><h2>Comments</h2><button type="button" id="script-comments-close" aria-label="Close comments">×</button></div><div id="tool-comment-list"></div></aside></div><div class="script-comment-composer" id="script-comment-composer" hidden><p>Comment on <q id="script-selected-quote"></q></p><label for="tool-comment-body">Comment</label><textarea id="tool-comment-body" rows="3" placeholder="Write a note about this passage"></textarea><div><button type="button" id="tool-comment-add">Post comment</button><button type="button" id="script-comment-cancel">Cancel</button></div></div></form>`;
}

export function paginateScreenplay(form: HTMLFormElement): void {
  const pages = form.querySelector<HTMLElement>(".script-pages");
  if (!pages) return;
  const blocks = Array.from(pages.querySelectorAll<HTMLElement>(".script-block"));
  const active = document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : null;
  const caret = active ? [active.selectionStart, active.selectionEnd] : null;
  const makePage = (number: number) => {
    const page = document.createElement("article");
    page.className = "script-page";
    page.setAttribute("aria-label", `Screenplay page ${number}`);
    page.innerHTML = `<div class="script-page-header"><span>${number}</span></div><div class="script-page-content"></div>`;
    pages.append(page);
    return page.querySelector<HTMLElement>(".script-page-content")!;
  };
  pages.replaceChildren();
  let content = makePage(1);
  content.append(...blocks);
  const availableHeight = content.getBoundingClientRect().height;
  const measured = blocks.map(block => ({
    block,
    height: block.getBoundingClientRect().height,
    marginTop: parseFloat(getComputedStyle(block).marginTop) || 0,
    marginBottom: parseFloat(getComputedStyle(block).marginBottom) || 0,
  }));
  content.replaceChildren();
  let usedHeight = 0;
  let previousMargin = 0;
  for (const { block, height, marginTop, marginBottom } of measured) {
    const gap = Math.max(previousMargin, marginTop);
    if (content.children.length && usedHeight + gap + height > availableHeight + 1) {
      content = makePage(pages.children.length + 1);
      usedHeight = 0;
      previousMargin = 0;
    }
    usedHeight += Math.max(previousMargin, marginTop) + height;
    content.append(block);
    previousMargin = marginBottom;
  }
  if (active && caret && active.isConnected) {
    active.focus({ preventScroll: true });
    active.setSelectionRange(caret[0], caret[1]);
  }
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
  const loadedRecords = await toolRecords(userId, project.id, tool);
  let supportRecords = tool === "screenplay" ? loadedRecords.filter(item => item.fields.kind?.startsWith("__")) : [];
  let records = tool === "screenplay" ? loadedRecords.filter(item => !item.fields.kind?.startsWith("__")) : loadedRecords;
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
  const savedRevisions = new Map(loadedRecords.map(record => [record.id, record.revision || 0]));
  const pendingRecordIds = new Map<string, number>();
  let settingsRecord = supportRecords.find(item => item.fields.kind === "__settings") || newToolRecord("Screenplay settings", { kind: "__settings", revisionMode: "false", title: project.title });
  const saveSettings = async () => {
    if (!supportRecords.some(item => item.id === settingsRecord.id)) supportRecords.push(settingsRecord);
    await persist(settingsRecord);
  };
  let saveQueue = Promise.resolve();
  let screenplaySaveTimer: ReturnType<typeof setTimeout> | undefined;
  let flushScreenplaySave = () => {};
  let contextMode: "find" | "title" | "history" | "drafts" | "revision" | "read" | "breakdown" | null = null;
  let findQuery = "";
  let findReplacement = "";
  let findCase = false;
  let findIndex = -1;
  let contextSelection: { blockId: string; from: number; to: number; text: string } | null = null;
  let readIndex = 0;
  let readPaused = false;
  let readToken = 0;
  let suppressUndo = false;
  const pendingBreakdownIds = new Set<string>();
  let updateScriptStats = () => {};
  let undoScript = () => {};
  let redoScript = () => {};
  let openScriptContext = (_mode: typeof contextMode) => {};
  const undoStack: { blockId: string; before: string; after: string; at: number }[] = [];
  const redoStack: typeof undoStack = [];
  let lastHistoryAt = Math.max(0, ...supportRecords.filter(item => item.fields.kind === "__history").map(item => Date.parse(item.createdAt) || 0));
  const ordered = () => [...records].sort((a, b) => (a.fields.order || a.createdAt).localeCompare(b.fields.order || b.createdAt));
  const remapBreakdownTags = (block: ToolRecord, before: string, after: string) => {
    if (before === after) return;
    for (const tag of supportRecords.filter(item => item.fields.kind === "__breakdown" && item.fields.blockId === block.id)) {
      const anchor = remapTextComment({ id: tag.id, from: Number(tag.fields.from), to: Number(tag.fields.to), quote: tag.fields.text || "", body: "", orphaned: tag.fields.orphaned === "true", resolved: false }, before, after);
      tag.fields = { ...tag.fields, from: String(anchor.from), to: String(anchor.to), text: anchor.quote, orphaned: String(anchor.orphaned) };
      pendingBreakdownIds.add(tag.id);
    }
  };
  const savePendingBreakdownTags = async () => {
    const tags = [...pendingBreakdownIds].map(id => supportRecords.find(item => item.id === id)).filter((item): item is ToolRecord => Boolean(item));
    pendingBreakdownIds.clear();
    for (const [index, tag] of tags.entries()) {
      try { await persist(tag); }
      catch (error) { tags.slice(index).forEach(item => pendingBreakdownIds.add(item.id)); throw error; }
    }
  };
  const syncSceneIds = async () => {
    let sceneId = "";
    for (const block of ordered()) {
      if (block.fields.kind === "Scene Heading") sceneId = block.id;
      if ((block.fields.sceneId || "") !== sceneId) {
        block.fields.sceneId = sceneId;
        await persist(block);
      }
    }
  };
  const saveSnapshot = async (kind: "__history" | "__draft", name: string) => {
    const snapshot = snapshotScript(ordered(), name);
    const entry = newToolRecord(name, { kind, snapshot: JSON.stringify(snapshot) });
    supportRecords.push(entry);
    await persist(entry);
    if (kind === "__history") lastHistoryAt = Date.now();
    return entry;
  };
  const persist = (record: ToolRecord) => {
    status.textContent = "Saving on this device…";
    const snapshot = { ...record, fields: { ...record.fields }, updatedAt: new Date().toISOString() };
    pendingRecordIds.set(record.id, (pendingRecordIds.get(record.id) || 0) + 1);
    const task = saveQueue.then(async () => {
      const revision = await saveToolRecord(userId, project.id, tool, snapshot, savedRevisions.get(record.id) || 0);
      savedRevisions.set(record.id, revision);
      record.revision = revision;
      record.updatedAt = snapshot.updatedAt;
      if (isCurrent()) status.textContent = userId === "local-demo-owner" ? "Saved in this browser" : "Synced to project cloud";
      if (tool === "screenplay" && !snapshot.fields.kind?.startsWith("__") && Date.now() - lastHistoryAt > 15 * 60_000) {
        lastHistoryAt = Date.now();
        void saveSnapshot("__history", new Date().toLocaleString()).catch(() => { lastHistoryAt = 0; });
      }
    });
    saveQueue = task.catch(() => {});
    return task.finally(() => { const remaining = (pendingRecordIds.get(record.id) || 1) - 1; if (remaining) pendingRecordIds.set(record.id, remaining); else pendingRecordIds.delete(record.id); });
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
      const scenes = tool === "screenplay" ? deriveScreenplayScenes(items, settingsRecord.fields.revisionMode === "true") : [];
      const sceneNav = tool === "screenplay" ? `<nav class="scene-nav" aria-label="Scene navigator"><div class="scene-nav-head"><h2>Scenes <span>${scenes.length}</span></h2><button type="button" id="script-navigator-close" aria-label="Close scene navigator">←</button></div><input id="scene-nav-search" type="search" placeholder="Find a scene" aria-label="Search scenes">${scenes.length ? `<div id="scene-nav-results">${scenes.map(scene => `<button type="button" class="scene-nav-item ${scene.id === selected ? "selected" : ""}" data-select="${escapeHtml(scene.id)}"><span>${escapeHtml(scene.displayNumber)}</span>${escapeHtml(scene.heading)}</button>`).join("")}</div>` : '<p class="tool-empty">Add a Scene Heading to build your navigator.</p>'}</nav>` : "";
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
  const storedSnapshot = (entry: ToolRecord): ScriptSnapshot | null => {
    try {
      const value = JSON.parse(entry.fields.snapshot || "null") as ScriptSnapshot;
      return value && Array.isArray(value.blocks) && value.blocks.every(block => typeof block.id === "string" && block.fields && typeof block.fields.kind === "string") ? value : null;
    } catch { return null; }
  };
  const applyScriptText = async (block: ToolRecord, text: string) => {
    const before = block.fields.text || "";
    remapBreakdownTags(block, before, text);
    const comments = JSON.parse(block.fields.comments || "[]") as TextComment[];
    block.fields.comments = JSON.stringify(comments.map(comment => remapTextComment(comment, before, text)));
    block.fields.text = text;
    block.title = text.split("\n")[0].trim().slice(0, 80) || "Untitled element";
    selected = block.id;
    await persist(block);
    await savePendingBreakdownTags();
    renderList(); renderEditor();
  };
  const restoreScriptSnapshot = async (snapshot: ScriptSnapshot) => {
    await saveSnapshot("__history", `Before restore · ${new Date().toLocaleString()}`);
    const wanted = new Set(snapshot.blocks.map(block => block.id));
    for (const block of records) if (!wanted.has(block.id)) {
      block.fields = { ...block.fields, kind: "__archived" };
      supportRecords.push(block);
      await persist(block);
    }
    const current = new Map(records.map(block => [block.id, block]));
    const restored: ToolRecord[] = [];
    for (const block of snapshot.blocks) {
      const target = current.get(block.id) || supportRecords.find(item => item.id === block.id) || { ...block, revision: 0 };
      target.title = block.title;
      target.fields = { ...block.fields };
      await persist(target);
      restored.push(target);
    }
    records = restored;
    supportRecords = supportRecords.filter(item => !wanted.has(item.id));
    selected = records[0]?.id;
    renderList(); renderEditor();
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
      editor.innerHTML = tool === "screenplay" ? `<div class="script-empty-desk"><div class="script-page script-empty-page"><div class="script-page-header"><span>1</span></div><div class="script-empty-invitation"><h2>Start your screenplay</h2><p>Add a scene heading, then build your story one element at a time.</p><button type="button" id="script-start">Add first scene</button></div></div></div>` : `${name === "calendar" ? calendarMarkup() : ""}<div class="tool-empty-state"><span>${tool === "locations" ? "⌖" : tool === "call-sheets" ? "▣" : tool === "notes" ? "▤" : "✦"}</span><h2>${name === "calendar" ? "No shoot days yet." : tool === "locations" ? "Map out your locations" : tool === "call-sheets" ? "Prepare your first call sheet" : tool === "notes" ? "Your documents start here" : "Start with an idea."}</h2><p>${name === "calendar" ? "Add entries in the Schedule tab." : tool === "locations" ? "Record addresses, contacts, permits and access notes." : tool === "call-sheets" ? "Create a daily plan from your schedule." : tool === "notes" ? "Create a document, give it a name and begin writing." : "Create an item to begin."}</p>${name !== "calendar" ? `<button type="button" id="empty-tool-add">＋ ${tool === "notes" ? "New document" : tool === "locations" ? "New location" : tool === "call-sheets" ? "New call sheet" : "Add first item"}</button>` : ""}</div>`;
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
    editor.innerHTML = isScript ? screenplayEditorMarkup(project, record, ordered(), settingsRecord.fields.revisionMode === "true") : `${name === "calendar" ? calendarMarkup() : ""}<form id="tool-form" class="tool-form"><div class="tool-form-header"><label class="tool-title-label">${isScript ? "Element title" : tool === "schedule" ? "Schedule item" : "Title"}<input name="title" value="${escapeHtml(record.title)}" maxlength="160" ${snapshot ? "readonly" : ""} required></label><div class="tool-form-actions">${tool === "call-sheets" && !snapshot ? '<button type="button" id="tool-publish">Publish version</button>' : ""}${(isScript || tool === "shots" || tool === "storyboards") && !snapshot ? '<button type="button" id="tool-up" aria-label="Move item up">↑</button><button type="button" id="tool-down" aria-label="Move item down">↓</button>' : ""}<button type="button" id="tool-print">Print / PDF</button>${name !== "calendar" ? '<button type="button" id="tool-remove" class="danger-text">Delete</button>' : ""}</div></div>${snapshot ? '<p class="tool-published">Published snapshot · This version is read only.</p>' : ""}<div class="tool-fields">${dataFields.map(field => `<label>${escapeHtml(field.label)}${field.key === "kind" ? `<select name="kind">${screenplayKinds.map(kind => `<option value="${escapeHtml(kind)}" ${record.fields.kind === kind ? "selected" : ""}>${escapeHtml(kind)}</option>`).join("")}</select>` : ["text", "body", "description", "notes", "schedule"].includes(field.key) ? `<textarea name="${field.key}" rows="${field.key === "text" || field.key === "body" ? 13 : 4}" ${snapshot ? "readonly" : ""}>${escapeHtml(valueFor(field.key))}</textarea>` : `<input name="${field.key}" type="${field.type || "text"}" value="${escapeHtml(valueFor(field.key))}" ${snapshot ? "readonly" : ""}>`}</label>`).join("")}</div>${isScript ? '<p class="script-shortcuts">Format element: Ctrl+1–9, or Alt+Shift+1–9 if your browser uses Ctrl+number. The menu above works on touch devices.</p>' : ""}${(tool === "shots" || tool === "storyboards") ? `<div class="tool-image-upload"><label>Upload reference image <input id="tool-image-file" type="file" accept="image/*"></label>${safeImage(record.fields.image || "") ? `<img alt="Reference image" src="${escapeHtml(safeImage(record.fields.image))}">` : ""}</div>` : ""}${isScript ? '<section class="tool-comments"><h2>Comments</h2><label>Comment on selected script text<textarea id="tool-comment-body" rows="2" placeholder="Leave a note for your crew"></textarea></label><button type="button" id="tool-comment-add">Add comment</button><div id="tool-comment-list"></div></section>' : ""}</form>`;
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
    if (isScript) {
      const actions = form.querySelector<HTMLElement>(".script-toolbar-actions")!;
      actions.insertAdjacentHTML("afterbegin", `<button type="button" id="script-undo" aria-label="Undo">↶</button><button type="button" id="script-redo" aria-label="Redo">↷</button><button type="button" id="script-find-open">Find</button><details class="script-more"><summary>More</summary><div>${([['title','Title page'],['history','History'],['drafts','Drafts'],['revision','Revision mode'],['read','Read through'],['breakdown','Breakdown']] as const).map(([mode,label]) => `<button type="button" data-script-panel="${mode}">${label}</button>`).join("")}</div></details>`);
      form.querySelector(".script-toolbar")!.insertAdjacentHTML("afterend", `<div class="script-statbar" id="script-statbar" aria-live="polite"></div>`);
      const panel = document.createElement("aside");
      panel.className = "script-context-panel";
      panel.id = "script-context-panel";
      panel.hidden = !contextMode;
      form.querySelector(".script-layout")!.append(panel);
      const updateStats = () => {
        const activePage = form.querySelector(".script-block-active")?.closest(".script-page")?.querySelector(".script-page-header")?.textContent || "1";
        form.querySelector("#script-statbar")!.textContent = `Page ${activePage} of ${form.querySelectorAll(".script-page").length} · ${wordCount(ordered()).toLocaleString()} words${settingsRecord.fields.revisionMode === "true" ? " · Revision mode" : ""}`;
      };
      updateScriptStats = updateStats;
      const openPanel = (mode: typeof contextMode) => {
        if (contextMode === "read" && mode !== "read") { readToken++; speechSynthesis.cancel(); readPaused = false; editor.querySelectorAll(".script-read-current").forEach(item => item.classList.remove("script-read-current")); }
        const area = form.querySelector<HTMLTextAreaElement>('textarea[name="text"]');
        if (area && area.selectionStart < area.selectionEnd) contextSelection = { blockId: record.id, from: area.selectionStart, to: area.selectionEnd, text: area.value.slice(area.selectionStart, area.selectionEnd) };
        contextMode = mode;
        panel.hidden = !mode;
        renderPanel();
      };
      openScriptContext = openPanel;
      const renderPanel = () => {
        if (!contextMode) return;
        const heading = { find: "Find & replace", title: "Title page", history: "History", drafts: "Named drafts", revision: "Revision mode", read: "Read through", breakdown: "Breakdown" }[contextMode];
        let body = "";
        if (contextMode === "find") body = `<label>Find<input id="script-find-query" type="search" value="${escapeHtml(findQuery)}" autocomplete="off"></label><label>Replace with<input id="script-replace-query" value="${escapeHtml(findReplacement)}"></label><label class="script-check"><input id="script-find-case" type="checkbox" ${findCase ? "checked" : ""}> Match case</label><p id="script-find-count"></p><div class="script-panel-actions"><button type="button" id="script-find-prev">Previous</button><button type="button" id="script-find-next">Next</button><button type="button" id="script-replace-one">Replace</button><button type="button" id="script-replace-all">Replace all</button></div>`;
        if (contextMode === "title") body = `<p>The title page is separate from screenplay scenes and appears in PDF exports.</p>${([['title','Title'],['writtenBy','Written by'],['basedOn','Based on'],['contact','Contact'],['copyright','Copyright'],['custom','Additional information']] as const).map(([key,label]) => `<label>${label}<input data-title-field="${key}" value="${escapeHtml(settingsRecord.fields[key] || (key === "title" ? project.title : ""))}"></label>`).join("")}`;
        if (contextMode === "history" || contextMode === "drafts") {
          const kind = contextMode === "history" ? "__history" : "__draft";
          const entries = supportRecords.filter(item => item.fields.kind === kind).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
          body = `${kind === "__draft" ? '<button type="button" id="script-save-draft">Save named draft</button>' : '<p>Automatic versions are captured at editing intervals.</p>'}${entries.length ? entries.map(entry => { const snapshot = storedSnapshot(entry); return snapshot ? `<details class="script-version"><summary>${escapeHtml(entry.title)} <small>${new Date(entry.createdAt).toLocaleString()}</small></summary><pre>${escapeHtml(snapshot.blocks.slice(0,8).map(block => block.fields.text || "").join("\n").slice(0,1200))}</pre><p>${snapshot.blocks.length} elements</p><button type="button" data-restore-script="${escapeHtml(entry.id)}">Restore this version</button></details>` : ""; }).join("") : '<p>No versions saved yet.</p>'}`;
        }
        if (contextMode === "revision") body = `<p>${settingsRecord.fields.revisionMode === "true" ? "Existing scene numbers are locked. Inserted scenes receive suffixes." : "Lock current scene numbers for production revisions."}</p><button type="button" id="script-revision-toggle">${settingsRecord.fields.revisionMode === "true" ? "Exit revision mode" : "Start revision mode"}</button>${settingsRecord.fields.revisionMode === "true" ? `<div class="script-revision-scenes">${deriveScreenplayScenes(ordered(), true).map(scene => `<div><span>${escapeHtml(scene.displayNumber)} ${escapeHtml(scene.heading)}</span><button type="button" data-omit-scene="${escapeHtml(scene.id)}">${scene.displayNumber.endsWith("OMITTED") ? "Restore" : "Mark omitted"}</button></div>`).join("")}</div>` : ""}`;
        if (contextMode === "read") body = `<p>Listen to the screenplay using your browser's speech voice.</p><div class="script-panel-actions"><button type="button" id="script-read-start">From beginning</button><button type="button" id="script-read-current">From current</button><button type="button" id="script-read-pause">${readPaused ? "Resume" : "Pause"}</button><button type="button" id="script-read-stop">Stop</button></div>`;
        if (contextMode === "breakdown") {
          const tags = supportRecords.filter(item => item.fields.kind === "__breakdown");
          const sceneLabels = new Map(deriveScreenplayScenes(ordered(), settingsRecord.fields.revisionMode === "true").map(scene => [scene.id, scene.displayNumber]));
          body = `<p>${contextSelection ? `Selected: “${escapeHtml(contextSelection.text)}”` : "Select screenplay text to tag it."}</p><label>Category<select id="script-tag-category">${['Cast','Extras','Props','Wardrobe','Makeup','Vehicles','Animals','Special Equipment','Set Dressing','Locations','Sound','VFX','SFX','Notes','Custom'].map(value => `<option>${value}</option>`).join("")}</select></label><button type="button" id="script-tag-save" ${contextSelection ? "" : "disabled"}>Tag selection</button><button type="button" id="script-create-shot">Create linked shot</button><div class="script-tags">${tags.map(tag => `<p><b>${escapeHtml(tag.fields.category || "Item")}</b> ${escapeHtml(tag.fields.text || "")} <small>${tag.fields.orphaned === "true" ? "Needs review · " : ""}Scene ${escapeHtml(sceneLabels.get(tag.fields.sceneId || "") || "—")}</small></p>`).join("")}</div>`;
        }
        panel.innerHTML = `<header><h2>${heading}</h2><button type="button" id="script-panel-close" aria-label="Close ${heading}">×</button></header>${body}`;
        panel.querySelector<HTMLButtonElement>("#script-panel-close")!.onclick = () => openPanel(null);
        if (contextMode === "find") {
          const search = panel.querySelector<HTMLInputElement>("#script-find-query")!;
          const replace = panel.querySelector<HTMLInputElement>("#script-replace-query")!;
          const count = panel.querySelector<HTMLElement>("#script-find-count")!;
          const matches = () => findScriptText(ordered(), findQuery, findCase);
          const showCount = () => { count.textContent = `${matches().length} matches`; };
          search.oninput = () => { findQuery = search.value; findIndex = -1; showCount(); };
          replace.oninput = () => { findReplacement = replace.value; };
          panel.querySelector<HTMLInputElement>("#script-find-case")!.onchange = event => { findCase = (event.currentTarget as HTMLInputElement).checked; findIndex = -1; showCount(); };
          showCount();
          const jump = (direction: number) => { const found = matches(); if (!found.length) return; findIndex = (findIndex + direction + found.length) % found.length; const match = found[findIndex]; selected = match.blockId; revealSelected = true; renderList(); renderEditor(); requestAnimationFrame(() => { const area = editor.querySelector<HTMLTextAreaElement>('textarea[name="text"]'); area?.focus(); area?.setSelectionRange(match.from, match.to); }); };
          panel.querySelector<HTMLButtonElement>("#script-find-next")!.onclick = () => jump(1);
          panel.querySelector<HTMLButtonElement>("#script-find-prev")!.onclick = () => jump(-1);
          panel.querySelector<HTMLButtonElement>("#script-replace-one")!.onclick = () => { const match = matches()[Math.max(0, findIndex)]; const block = records.find(item => item.id === match?.blockId); if (!match || !block) return; void applyScriptText(block, (block.fields.text || "").slice(0,match.from) + findReplacement + (block.fields.text || "").slice(match.to)); };
          panel.querySelector<HTMLButtonElement>("#script-replace-all")!.onclick = async () => { const found = matches(); if (!found.length || !confirm(`Replace ${found.length} matches throughout this screenplay? A history version will be saved first.`)) return; await saveSnapshot("__history", "Before Replace All"); const grouped = new Map<string, typeof found>(); found.forEach(match => grouped.set(match.blockId, [...(grouped.get(match.blockId) || []), match])); for (const [id, ranges] of grouped) { const block = records.find(item => item.id === id)!; let text = block.fields.text || ""; for (const range of ranges.reverse()) text = text.slice(0, range.from) + findReplacement + text.slice(range.to); const comments = JSON.parse(block.fields.comments || "[]") as TextComment[]; block.fields.comments = JSON.stringify(comments.map(comment => remapTextComment(comment, block.fields.text || "", text))); remapBreakdownTags(block, block.fields.text || "", text); block.fields.text = text; block.title = text.split("\n")[0].trim().slice(0,80) || "Untitled element"; await persist(block); } await savePendingBreakdownTags(); renderList(); renderEditor(); };
        }
        if (contextMode === "title") panel.querySelectorAll<HTMLInputElement>("[data-title-field]").forEach(input => input.onchange = () => { settingsRecord.fields[input.dataset.titleField!] = input.value; void saveSettings().catch(error => { status.textContent = error.message; }); });
        if (contextMode === "drafts") panel.querySelector<HTMLButtonElement>("#script-save-draft")!.onclick = async () => { const name = prompt("Name this screenplay draft"); if (!name?.trim()) return; await saveSnapshot("__draft", name.trim().slice(0,80)); renderPanel(); };
        panel.querySelectorAll<HTMLButtonElement>("[data-restore-script]").forEach(button => button.onclick = async () => { const entry = supportRecords.find(item => item.id === button.dataset.restoreScript); const snapshot = entry && storedSnapshot(entry); if (!snapshot || !confirm(`Restore “${entry!.title}”? The current screenplay will be saved in History first.`)) return; await restoreScriptSnapshot(snapshot); });
        if (contextMode === "revision") {
          panel.querySelector<HTMLButtonElement>("#script-revision-toggle")!.onclick = async () => { const active = settingsRecord.fields.revisionMode === "true"; if (!active) { const headings = ordered().filter(item => item.fields.kind === "Scene Heading"); for (const [index, heading] of headings.entries()) { heading.fields.sceneNumber = String(index + 1); await persist(heading); } } settingsRecord.fields.revisionMode = String(!active); await saveSettings(); renderList(); renderEditor(); };
          panel.querySelectorAll<HTMLButtonElement>("[data-omit-scene]").forEach(button => button.onclick = async () => { const scene = records.find(item => item.id === button.dataset.omitScene)!; scene.fields.omitted = scene.fields.omitted === "true" ? "false" : "true"; await persist(scene); renderList(); renderEditor(); });
        }
        if (contextMode === "read") {
          const stop = () => { readToken++; speechSynthesis.cancel(); editor.querySelectorAll(".script-read-current").forEach(item => item.classList.remove("script-read-current")); readPaused = false; };
          const speak = (token: number) => { if (token !== readToken) return; const blocks = ordered(); if (readIndex >= blocks.length) { stop(); return; } const block = blocks[readIndex++]; const utterance = new SpeechSynthesisUtterance(block.fields.kind === "Character" ? `${block.fields.text}.` : block.fields.text || ""); utterance.onstart = () => { if (token !== readToken) return; editor.querySelectorAll(".script-read-current").forEach(item => item.classList.remove("script-read-current")); editor.querySelector(`[data-script-id="${CSS.escape(block.id)}"]`)?.classList.add("script-read-current"); }; utterance.onend = () => speak(token); speechSynthesis.speak(utterance); };
          panel.querySelector<HTMLButtonElement>("#script-read-start")!.onclick = () => { stop(); readIndex = 0; speak(readToken); };
          panel.querySelector<HTMLButtonElement>("#script-read-current")!.onclick = () => { stop(); readIndex = Math.max(0, ordered().findIndex(item => item.id === selected)); speak(readToken); };
          panel.querySelector<HTMLButtonElement>("#script-read-pause")!.onclick = () => { if (readPaused) speechSynthesis.resume(); else speechSynthesis.pause(); readPaused = !readPaused; renderPanel(); };
          panel.querySelector<HTMLButtonElement>("#script-read-stop")!.onclick = stop;
        }
        if (contextMode === "breakdown") {
          panel.querySelector<HTMLButtonElement>("#script-tag-save")!.onclick = async () => { if (!contextSelection) return; const block = records.find(item => item.id === contextSelection!.blockId); if (!block) return; const category = panel.querySelector<HTMLSelectElement>("#script-tag-category")!.value; const tag = newToolRecord(contextSelection.text, { kind: "__breakdown", blockId: block.id, sceneId: sceneIdAt(ordered(), block.id) || "", from: String(contextSelection.from), to: String(contextSelection.to), text: contextSelection.text, category, itemKey: `${category}:${contextSelection.text.toLocaleLowerCase()}` }); supportRecords.push(tag); await persist(tag); renderPanel(); };
          panel.querySelector<HTMLButtonElement>("#script-create-shot")!.onclick = async () => { const block = records.find(item => item.id === (contextSelection?.blockId || selected)); if (!block) return; const shot = newToolRecord("Shot from screenplay", { sceneId: sceneIdAt(ordered(), block.id) || "", scriptBlockId: block.id, description: contextSelection?.text || block.fields.text || "", status: "Planned" }); await saveToolRecord(userId, project.id, "shots", shot, 0); status.textContent = "Linked shot added to Shot Lists"; };
        }
      };
      actions.querySelector<HTMLButtonElement>("#script-find-open")!.onclick = () => openPanel("find");
      actions.querySelectorAll<HTMLButtonElement>("[data-script-panel]").forEach(button => button.onclick = () => { actions.querySelector<HTMLDetailsElement>(".script-more")!.open = false; openPanel(button.dataset.scriptPanel as typeof contextMode); });
      const runUndo = (redo = false) => {
        const source = redo ? redoStack : undoStack;
        const target = redo ? undoStack : redoStack;
        const operation = source.pop();
        if (!operation) return;
        target.push(operation);
        const block = records.find(item => item.id === operation.blockId);
        if (!block) return;
        suppressUndo = true;
        void applyScriptText(block, redo ? operation.after : operation.before).finally(() => {
          suppressUndo = false;
          requestAnimationFrame(() => { const area = editor.querySelector<HTMLTextAreaElement>('textarea[name="text"]'); area?.focus({ preventScroll: true }); area?.setSelectionRange(area.value.length, area.value.length); });
        });
      };
      undoScript = () => runUndo();
      redoScript = () => runUndo(true);
      actions.querySelector<HTMLButtonElement>("#script-undo")!.onclick = undoScript;
      actions.querySelector<HTMLButtonElement>("#script-redo")!.onclick = redoScript;
      if (contextMode) renderPanel();
      updateStats();
      paginateScreenplay(form);
      updateStats();
      activePageResizeCleanup?.();
      let resizeFrame = 0;
      const onResize = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; if (form.isConnected) paginateScreenplay(form); }); };
      window.addEventListener("resize", onResize, { passive: true });
      activePageResizeCleanup = () => { window.removeEventListener("resize", onResize); if (resizeFrame) cancelAnimationFrame(resizeFrame); };
    }
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
    if (tool === "screenplay") editor.querySelectorAll<HTMLButtonElement>("[data-script-select]").forEach(button => button.onclick = event => { const commentId = (event.target as Element).closest<HTMLElement>("[data-comment-id]")?.dataset.commentId; selected = button.dataset.scriptSelect; revealSelected = true; renderList(); renderEditor(); if (commentId) { const comments = editor.querySelector<HTMLElement>("#script-comments-panel"); if (comments) comments.hidden = false; editor.querySelector(`[data-comment-thread="${CSS.escape(commentId)}"]`)?.scrollIntoView({ block: "nearest" }); } });
    if (!snapshot) form.addEventListener("input", event => {
      if (tool === "screenplay" && !(event.target instanceof HTMLTextAreaElement && event.target.name === "text") && !(event.target instanceof HTMLSelectElement && event.target.name === "kind")) return;
      const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      const kindChanged = tool === "screenplay" && values.kind !== record.fields.kind;
      if ((tool === "shots" || tool === "storyboards") && !values.image && record.fields.image?.startsWith("data:image/")) delete values.image;
      record.title = tool === "screenplay" ? (values.text || "").split("\n")[0].trim().slice(0, 80) || "Untitled element" : values.title || "Untitled";
      if (tool === "screenplay" && values.text !== record.fields.text) {
        remapBreakdownTags(record, record.fields.text || "", values.text || "");
        if (!suppressUndo && event.target instanceof HTMLTextAreaElement && event.target.name === "text") {
          const now = Date.now();
          const last = undoStack.at(-1);
          if (last?.blockId === record.id && now - last.at < 800) { last.after = values.text || ""; last.at = now; }
          else { undoStack.push({ blockId: record.id, before: record.fields.text || "", after: values.text || "", at: now }); if (undoStack.length > 200) undoStack.shift(); }
          redoStack.length = 0;
        }
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        record.fields.comments = JSON.stringify(comments.map(comment => remapTextComment(comment, record.fields.text || "", values.text || "")));
      }
      record.fields = { ...record.fields, ...values };
      if (kindChanged && record.fields.kind === "Scene Heading") record.fields.sceneId = record.id;
      if (tool === "screenplay" && record.fields.kind === "Scene Heading" && settingsRecord.fields.revisionMode === "true" && !record.fields.sceneNumber) {
        const headings = ordered().filter(item => item.fields.kind === "Scene Heading");
        record.fields.sceneNumber = revisionSceneLabels(headings)[headings.findIndex(item => item.id === record.id)];
      }
      record.updatedAt = new Date().toISOString();
      const isScriptTextInput = tool === "screenplay" && event.target instanceof HTMLTextAreaElement && event.target.name === "text";
      if (isScriptTextInput) {
        if (screenplaySaveTimer) clearTimeout(screenplaySaveTimer);
        screenplaySaveTimer = setTimeout(() => {
          screenplaySaveTimer = undefined;
          renderList();
          void persist(record).then(savePendingBreakdownTags).catch(error => { status.textContent = `Save failed: ${error.message}`; });
        }, 550);
        status.textContent = "Saving…";
        return;
      }
      renderList();
      if (tool === "screenplay" && event.target instanceof HTMLSelectElement && event.target.name === "kind") renderEditor();
      if (name === "calendar") { const board = editor.querySelector(".calendar-board"); if (board) { board.outerHTML = calendarMarkup(); wireCalendar(); } }
      void persist(record).then(() => kindChanged ? syncSceneIds() : undefined).catch(error => { status.textContent = `Save failed: ${error.message}`; });
    });
    editor.querySelector("#tool-remove")?.addEventListener("click", async () => {
      if (!confirm(`Delete “${record.title}”? This cannot be undone.`)) return;
      await saveQueue; await deleteToolRecord(userId, project.id, tool, record.id);
      savedRevisions.delete(record.id); records = records.filter(item => item.id !== record.id); selected = ordered()[0]?.id;
      status.textContent = "Deleted from this device"; renderList(); renderEditor();
    });
    editor.querySelector("#tool-print")?.addEventListener("click", () => {
      const paper = document.querySelector<HTMLElement>("#tool-print-document")!;
      if (tool === "screenplay") {
        const title = settingsRecord.fields;
        paper.innerHTML = `<section class="script-title-page"><h1>${escapeHtml(title.title || project.title)}</h1><p>${title.writtenBy ? `Written by<br>${escapeHtml(title.writtenBy)}` : ""}</p><p>${escapeHtml(title.basedOn || "")}</p><div>${escapeHtml(title.contact || "").replaceAll("\n", "<br>")}<br>${escapeHtml(title.copyright || "")}<br>${escapeHtml(title.custom || "")}</div></section>${ordered().map(item => `<p class="script-print-${(item.fields.kind || "Text").toLowerCase().replaceAll(" ", "-")}">${escapeHtml(item.fields.text || "")}</p>`).join("")}`;
      }
      else paper.innerHTML = `<h1>${escapeHtml(project.title)}</h1><h2>${escapeHtml(record.title)}</h2>${Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[name]")).filter(input => input.name !== "title" && input.name !== "richBody").map(input => `<section><h2>${escapeHtml(input.closest("label")?.querySelector("span")?.textContent || input.name)}</h2><p>${escapeHtml(input.value || "—")}</p></section>`).join("")}`;
      print();
    });
    for (const [direction, offset] of [["up", -1], ["down", 1]] as const) editor.querySelector(`#tool-${direction}`)?.addEventListener("click", async () => {
      const items = ordered(); const index = items.findIndex(item => item.id === record.id); const other = items[index + offset];
      if (!other) return;
      if (tool === "screenplay") {
        const before = offset < 0 ? items[index - 2] : other;
        const after = offset < 0 ? other : items[index + 2];
        record.fields.order = orderBetween(before?.fields.order || before?.createdAt, after?.fields.order || after?.createdAt);
        await persist(record); await syncSceneIds(); renderList(); renderEditor();
        return;
      }
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
        void persist(record).then(savePendingBreakdownTags).catch(error => { status.textContent = `Save failed: ${error.message}`; });
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
        if (kind === "Scene Heading" && !block.querySelector(".script-scene-number")) {
          const number = document.createElement("span"); number.className = "script-scene-number"; block.prepend(number);
        } else if (kind !== "Scene Heading") block.querySelector(".script-scene-number")?.remove();
        area.spellcheck = kind !== "Character" && kind !== "Scene Heading";
      });
      const sizeScriptInput = () => { area.style.height = "0px"; area.style.height = `${Math.max(18, area.scrollHeight)}px`; };
      sizeScriptInput();
      paginateScreenplay(form);
      let pageTimer: ReturnType<typeof setTimeout> | undefined;
      area.addEventListener("input", () => {
        sizeScriptInput();
        if (pageTimer) clearTimeout(pageTimer);
        pageTimer = setTimeout(() => { if (form.isConnected) { paginateScreenplay(form); updateScriptStats(); } }, 700);
      });
      area.addEventListener("blur", flushScreenplaySave);
      const suggestions = form.querySelector<HTMLElement>("#script-suggestions")!;
      let suggestionValues: string[] = [];
      let activeSuggestion = 0;
      let suggestionInteracted = false;
      const hideSuggestions = () => { suggestions.hidden = true; suggestionValues = []; activeSuggestion = 0; suggestionInteracted = false; };
      const applySuggestion = (value: string) => {
        area.value = value;
        area.dispatchEvent(new Event("input", { bubbles: true }));
        area.setSelectionRange(area.value.length, area.value.length);
        hideSuggestions();
      };
      const showSuggestions = () => {
        const kind = form.querySelector<HTMLSelectElement>('select[name="kind"]')!.value;
        suggestionValues = kind === "Character" ? characterSuggestions(records.filter(item => item.id !== record.id), area.value) : kind === "Scene Heading" ? sceneHeadingSuggestions(records.filter(item => item.id !== record.id), area.value) : [];
        if (!suggestionValues.length || (suggestionValues.length === 1 && suggestionValues[0] === area.value.trim().toLocaleUpperCase())) { hideSuggestions(); return; }
        suggestions.innerHTML = suggestionValues.map((value, index) => `<button type="button" role="option" aria-selected="${index === activeSuggestion}" data-script-suggestion="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
        suggestions.hidden = false;
        suggestions.querySelectorAll<HTMLButtonElement>("[data-script-suggestion]").forEach(button => button.onclick = () => applySuggestion(button.dataset.scriptSuggestion || ""));
      };
      area.addEventListener("input", showSuggestions);
      const createNextBlock = async (kind = nextScreenplayKind(form.querySelector<HTMLSelectElement>('select[name="kind"]')!.value, !area.value.trim())) => {
        flushScreenplaySave();
        const items = ordered();
        const index = items.findIndex(item => item.id === record.id);
        const next = newToolRecord("Untitled element", { kind, text: "", sceneId: kind === "Scene Heading" ? "" : sceneIdAt(items, record.id) || "" });
        next.fields.order = orderBetween(record.fields.order || record.createdAt, items[index + 1]?.fields.order || items[index + 1]?.createdAt);
        if (kind === "Scene Heading") next.fields.sceneId = next.id;
        records.push(next);
        if (kind === "Scene Heading" && settingsRecord.fields.revisionMode === "true") {
          const headings = ordered().filter(item => item.fields.kind === "Scene Heading");
          next.fields.sceneNumber = revisionSceneLabels(headings)[headings.findIndex(item => item.id === next.id)];
        }
        selected = next.id;
        revealSelected = true;
        await persist(next);
        renderList();
        renderEditor();
      };
      area.addEventListener("keydown", event => {
        if (!suggestions.hidden && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault(); suggestionInteracted = true; activeSuggestion = (activeSuggestion + (event.key === "ArrowDown" ? 1 : suggestionValues.length - 1)) % suggestionValues.length; showSuggestions(); return;
        }
        if (!suggestions.hidden && event.key === "Escape") { hideSuggestions(); return; }
        if (!suggestions.hidden && event.key === "Enter" && suggestionInteracted) {
          event.preventDefault(); applySuggestion(suggestionValues[activeSuggestion]);
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
        target.innerHTML = comments.length ? comments.map(comment => `<article class="tool-comment ${comment.orphaned ? "orphaned" : ""} ${comment.resolved ? "resolved" : ""}" data-comment-thread="${escapeHtml(comment.id)}"><small>${comment.orphaned ? "Orphaned anchor" : escapeHtml(comment.quote)}</small><p>${escapeHtml(comment.body)}</p>${comment.replies?.map(reply => `<p class="tool-comment-reply">${escapeHtml(reply.body)}</p>`).join("") || ""}${comment.resolved ? "" : `<label class="tool-comment-reply-form"><span class="sr-only">Reply</span><input data-comment-reply-input="${escapeHtml(comment.id)}" placeholder="Reply…"><button type="button" data-comment-reply="${escapeHtml(comment.id)}" data-comment-block="${escapeHtml(comment.blockId!)}">Reply</button></label>`}<button type="button" data-comment-focus="${escapeHtml(comment.id)}">Go to text</button><button type="button" data-comment="${escapeHtml(comment.id)}" data-comment-block="${escapeHtml(comment.blockId!)}">${comment.resolved ? "Reopen" : "Resolve"}</button></article>`).join("") : '<p class="tool-empty">No comments yet.</p>';
        target.querySelectorAll<HTMLButtonElement>("[data-comment-focus]").forEach(button => button.onclick = () => { const comment = comments.find(item => item.id === button.dataset.commentFocus); if (!comment) return; selected = comment.blockId; revealSelected = true; renderList(); renderEditor(); });
        target.querySelectorAll<HTMLButtonElement>("[data-comment]").forEach(button => button.onclick = () => {
          const block = records.find(item => item.id === button.dataset.commentBlock); if (!block) return;
          const blockComments = JSON.parse(block.fields.comments || "[]") as TextComment[];
          const comment = blockComments.find(item => item.id === button.dataset.comment)!; comment.resolved = !comment.resolved; block.fields.comments = JSON.stringify(blockComments); void persist(block); showComments();
        });
        target.querySelectorAll<HTMLButtonElement>("[data-comment-reply]").forEach(button => button.onclick = () => {
          const input = target.querySelector<HTMLInputElement>(`[data-comment-reply-input="${CSS.escape(button.dataset.commentReply || "")}"]`);
          const body = input?.value.trim(); const block = records.find(item => item.id === button.dataset.commentBlock);
          if (!body || !block) return;
          const blockComments = JSON.parse(block.fields.comments || "[]") as TextComment[];
          const comment = blockComments.find(item => item.id === button.dataset.commentReply)!;
          comment.replies = [...(comment.replies || []), { id: crypto.randomUUID(), body, createdAt: new Date().toISOString() }];
          block.fields.comments = JSON.stringify(blockComments); void persist(block); showComments();
        });
      };
      showComments();
      editor.querySelector("#tool-comment-add")?.addEventListener("click", async () => {
        if (!selectedPassage) { status.textContent = "Select script text before adding a comment."; area.focus(); return; }
        const body = editor.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.value.trim();
        if (!body) { status.textContent = "Write a comment first."; return; }
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        comments.push({ id: crypto.randomUUID(), blockId: record.id, ...selectedPassage, body, author: userId, createdAt: new Date().toISOString(), orphaned: false, resolved: false, replies: [] });
        record.fields.comments = JSON.stringify(comments); await persist(record);
        editor.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.value = ""; composer.hidden = true; selectedPassage = null; panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); showComments();
      });
      if (revealSelected) {
        revealSelected = false;
        requestAnimationFrame(() => editor.querySelector<HTMLElement>(`[data-script-id="${CSS.escape(record.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
      const sceneIds = deriveScreenplayScenes(ordered()).map(scene => scene.id);
      let sceneScrollFrame = 0;
      const updateActiveScene = () => {
        sceneScrollFrame = 0;
        const active = sceneIds.map(id => editor.querySelector<HTMLElement>(`[data-script-id="${CSS.escape(id)}"]`)).filter((element): element is HTMLElement => Boolean(element)).filter(element => element.getBoundingClientRect().top < 220).at(-1);
        if (!active) return;
        list.querySelectorAll<HTMLButtonElement>(".scene-nav-item[data-select]").forEach(button => button.classList.toggle("selected", button.dataset.select === active.dataset.scriptId));
      };
      const scheduleSceneUpdate = () => { if (!sceneScrollFrame) sceneScrollFrame = requestAnimationFrame(updateActiveScene); };
      activeSceneScrollCleanup?.();
      window.addEventListener("scroll", scheduleSceneUpdate, { passive: true });
      editor.addEventListener("scroll", scheduleSceneUpdate, { passive: true });
      activeSceneScrollCleanup = () => { window.removeEventListener("scroll", scheduleSceneUpdate); editor.removeEventListener("scroll", scheduleSceneUpdate); if (sceneScrollFrame) cancelAnimationFrame(sceneScrollFrame); };
      updateActiveScene();
    }
    if (tool === "screenplay") form.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase();
        const writing = event.target instanceof HTMLTextAreaElement && event.target.name === "text";
        if ((key === "z" || key === "y") && writing) { event.preventDefault(); if (key === "y" || event.shiftKey) redoScript(); else undoScript(); return; }
        if (key === "f") { event.preventDefault(); openScriptContext("find"); requestAnimationFrame(() => editor.querySelector<HTMLInputElement>("#script-find-query")?.focus()); return; }
        if (["b", "i", "u"].includes(key) && writing) { event.preventDefault(); status.textContent = "Inline bold, italic, and underline are not available yet."; return; }
      }
      if (event.key === "Tab" && event.target instanceof HTMLTextAreaElement && event.target.name === "text" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault(); const select = form.querySelector<HTMLSelectElement>('select[name="kind"]')!; const index = screenplayKinds.indexOf(select.value as typeof screenplayKinds[number]); select.value = screenplayKinds[(index + (event.shiftKey ? 8 : 1)) % 9]; select.dispatchEvent(new Event("input", { bubbles: true })); return;
      }
      if (!(event.target instanceof HTMLTextAreaElement && event.target.name === "text") || !(((event.ctrlKey || event.metaKey) && !event.altKey) || (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey))) return;
      const digit = event.code.match(/^Digit([0-8])$/)?.[1] ?? (/^[0-8]$/.test(event.key) ? event.key : undefined);
      if (digit === undefined) return;
      const shortcutKinds: Record<string, ScreenplayKind> = { "0": "Act", "1": "Scene Heading", "2": "Action", "3": "Character", "4": "Dialogue", "5": "Parenthetical", "6": "Transition", "7": "Shot", "8": "Text" };
      const kind = event.ctrlKey || event.metaKey ? shortcutKinds[digit] : screenplayKinds[Number(digit)];
      if (!kind) return;
      event.preventDefault(); const select = form.querySelector<HTMLSelectElement>('select[name="kind"]')!;
      select.value = kind; select.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  renderList(); renderEditor();
  status.textContent = userId === "local-demo-owner" ? "Saved in this browser" : "Synced to project cloud";
  if (tool === "screenplay" && records.length && !supportRecords.some(item => item.fields.kind === "__history")) {
    void saveSnapshot("__history", "Initial saved version").catch(() => { status.textContent = "History could not be saved"; });
  }
  if (userId !== "local-demo-owner" && userId !== "anonymous") {
    void import("./cloud.js").then(({ supabase }) => {
      activeToolChannel?.unsubscribe();
      activeToolChannel = supabase.channel(`project-tools:${project.id}:${tool}`).on("postgres_changes", { event: "*", schema: "public", table: "project_tool_records", filter: `project_id=eq.${project.id}` }, async payload => {
        const changed = (payload.new as { tool?: string } | undefined)?.tool || (payload.old as { tool?: string } | undefined)?.tool;
        if (changed !== tool || !isCurrent()) return;
        const changedRecord = payload.new as { id?: string; revision?: number } | undefined;
        if (changedRecord?.id && (pendingRecordIds.has(changedRecord.id) || (changedRecord.revision || 0) <= (savedRevisions.get(changedRecord.id) || 0))) return;
        if (tool === "screenplay" && screenplaySaveTimer) { status.textContent = "A collaborator edited this project. Your current text remains in place until it saves."; return; }
        const refreshed = await toolRecords(userId, project.id, tool);
        supportRecords = tool === "screenplay" ? refreshed.filter(item => item.fields.kind?.startsWith("__")) : [];
        records = tool === "screenplay" ? refreshed.filter(item => !item.fields.kind?.startsWith("__")) : refreshed;
        if (tool === "screenplay") settingsRecord = supportRecords.find(item => item.fields.kind === "__settings") || settingsRecord;
        savedRevisions.clear(); refreshed.forEach(item => savedRevisions.set(item.id, item.revision || 0));
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
    if (tool === "screenplay") {
      const items = ordered();
      const previous = items.at(-1);
      record.fields.order = orderBetween(previous?.fields.order || previous?.createdAt, undefined);
      record.fields.sceneId = nextKind === "Scene Heading" ? record.id : previous ? sceneIdAt(items, previous.id) || "" : "";
      if (nextKind === "Scene Heading" && settingsRecord.fields.revisionMode === "true") {
        const headings = [...items, record].filter(item => item.fields.kind === "Scene Heading");
        record.fields.sceneNumber = revisionSceneLabels(headings).at(-1)!;
      }
    } else record.fields.order = String(records.length).padStart(6, "0");
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
