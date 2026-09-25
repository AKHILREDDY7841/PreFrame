import type { Project } from "./domain.js";
import { deleteToolRecord, newToolRecord, saveToolRecord, toolRecords, type ToolName, type ToolRecord } from "./tool-data.js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const labels: Record<ToolName, string> = { screenplay: "Screenplay", notes: "Docs & Notes", shots: "Shot Lists", storyboards: "Storyboards", schedule: "Production Schedule", locations: "Locations", "call-sheets": "Call Sheets" };
const fields: Record<ToolName, { key: string; label: string; type?: string }[]> = {
  screenplay: [{ key: "kind", label: "Element" }, { key: "text", label: "Script text" }],
  notes: [{ key: "body", label: "Note" }],
  shots: [{ key: "scene", label: "Scene" }, { key: "description", label: "Description" }, { key: "size", label: "Shot size" }, { key: "type", label: "Shot type" }, { key: "movement", label: "Movement" }, { key: "estimate", label: "Est. time" }, { key: "image", label: "Image URL", type: "url" }],
  storyboards: [{ key: "shot", label: "Shot" }, { key: "description", label: "Description" }, { key: "sound", label: "Sound effects" }, { key: "video", label: "Video reference URL", type: "url" }, { key: "image", label: "Image URL", type: "url" }],
  schedule: [{ key: "day", label: "Day" }, { key: "date", label: "Date", type: "date" }, { key: "sceneNumbers", label: "Scene Number(s)" }, { key: "scriptPages", label: "Script Pages" }, { key: "location", label: "Location" }, { key: "time", label: "Time" }, { key: "characters", label: "Characters" }, { key: "actorsRequired", label: "Actors Required" }, { key: "propsRequired", label: "Props Required" }, { key: "costumes", label: "Costumes" }, { key: "equipmentRequired", label: "Equipment Required" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "backupStatus", label: "Backup Status" }, { key: "notes", label: "Notes" }],
  locations: [{ key: "address", label: "Address" }, { key: "contact", label: "Contact" }, { key: "phone", label: "Phone" }, { key: "permit", label: "Permit status" }, { key: "access", label: "Access / parking" }, { key: "notes", label: "Notes" }],
  "call-sheets": [{ key: "date", label: "Shoot date", type: "date" }, { key: "call", label: "General call", type: "time" }, { key: "location", label: "Location" }, { key: "weather", label: "Weather" }, { key: "contacts", label: "Emergency contacts" }, { key: "schedule", label: "Schedule snapshot" }, { key: "notes", label: "Notes" }],
};
export const screenplayKinds = ["Act", "Scene Heading", "Action", "Character", "Dialogue", "Parenthetical", "Transition", "Shot", "Text"] as const;
export const localDateISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
type TextComment = { id: string; from: number; to: number; quote: string; body: string; orphaned: boolean; resolved: boolean };
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
    if (item.id !== selected.id) return `<button type="button" class="script-block script-block-preview script-${kindClass}" data-script-select="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(kind)} element">${escapeHtml(item.fields.text || " ")}</button>`;
    return `<div class="script-block script-block-active script-${kindClass}"><span class="script-block-kind">${escapeHtml(kind)}</span><textarea name="text" aria-label="Script text" dir="auto" rows="${Math.max(2, Math.min(12, (item.fields.text || "").split("\n").length + 1))}" spellcheck="true">${escapeHtml(item.fields.text || "")}</textarea><button type="button" class="script-selection-action" id="script-comment-open" aria-label="Add comment to selected text" hidden>Add comment</button></div>`;
  };
  return `<form id="tool-form" class="script-editor-form"><div class="script-toolbar"><div class="script-toolbar-main"><label class="script-kind-label">Element <select name="kind">${screenplayKinds.map(kind => `<option value="${escapeHtml(kind)}" ${selected.fields.kind === kind ? "selected" : ""}>${escapeHtml(kind)}</option>`).join("")}</select></label><span class="script-shortcuts">Ctrl+1–9 · Alt+Shift+1–9</span></div><div class="script-toolbar-actions"><button type="button" id="tool-up" aria-label="Move element up">↑</button><button type="button" id="tool-down" aria-label="Move element down">↓</button><button type="button" id="script-comments-toggle" aria-expanded="false" aria-controls="script-comments-panel">View comments</button><button type="button" id="tool-print">Print / PDF</button><button type="button" id="tool-remove" class="danger-text">Delete element</button></div></div><input type="hidden" name="title" value="${escapeHtml(selected.title)}"><div class="script-layout"><div class="script-page" aria-label="Screenplay draft"><div class="script-page-header"><span>${escapeHtml(project.title)}</span><span>Script draft</span></div><div class="script-page-content">${items.map(element).join("")}</div></div><aside class="tool-comments script-comments" id="script-comments-panel" aria-label="Screenplay comments" hidden><div class="script-comments-head"><h2>Comments</h2><button type="button" id="script-comments-close" aria-label="Close comments">×</button></div><div id="tool-comment-list"></div></aside></div><div class="script-comment-composer" id="script-comment-composer" hidden><p>Comment on <q id="script-selected-quote"></q></p><label for="tool-comment-body">Comment</label><textarea id="tool-comment-body" rows="3" placeholder="Write a note about this passage"></textarea><div><button type="button" id="tool-comment-add">Post comment</button><button type="button" id="script-comment-cancel">Cancel</button></div></div></form>`;
}

export function toolWorkspace(project: Project, name: string, href: (path: string) => string): string {
  const tool: ToolName = name === "calendar" ? "schedule" : name as ToolName;
  const label = name === "calendar" ? "Calendar" : labels[tool];
  const write = tool === "screenplay" || tool === "notes";
  return `<main class="tool-page" data-tool="${escapeHtml(name)}" data-project="${escapeHtml(project.id)}"><div class="tool-topline"><a href="${href(`/app/projects/${project.id}`)}" data-route>← ${escapeHtml(project.title)}</a><span>Project tools</span>${write ? '<button id="eye" type="button" aria-pressed="false">Eye saver</button>' : ""}</div>${toolNavigation(project.id, href)}<div class="tool-heading"><div><p class="eyebrow">${escapeHtml(project.title.toUpperCase())}</p><h1>${label}</h1><p>${name === "calendar" ? "Shoot days from your production schedule." : tool === "call-sheets" ? "Create a call sheet from your schedule, then publish a fixed version." : "Changes on this device save automatically."}</p></div>${name === "calendar" ? "" : `<button id="tool-add" class="button" type="button">＋ ${tool === "screenplay" ? "Add element" : tool === "notes" ? "New document" : tool === "shots" ? "Add shot" : tool === "storyboards" ? "Add frame" : tool === "schedule" ? "Add schedule entry" : tool === "locations" ? "New location" : "New call sheet"}</button>`}</div><p class="tool-save-status" id="tool-status" role="status">Loading…</p><div class="tool-body"><aside class="tool-list" id="tool-list" aria-label="${label} items"></aside><section class="tool-editor" id="tool-editor" aria-label="Editor"></section></div><article id="tool-print-document" aria-hidden="true"></article></main>`;
}

export async function mountToolWorkspace(project: Project, name: string, userId: string, premium = false): Promise<void> {
  const tool: ToolName = name === "calendar" ? "schedule" : name as ToolName;
  const list = document.querySelector<HTMLElement>("#tool-list")!;
  const editor = document.querySelector<HTMLElement>("#tool-editor")!;
  const status = document.querySelector<HTMLElement>("#tool-status")!;
  const isCurrent = () => document.querySelector<HTMLElement>(".tool-page")?.dataset.project === project.id && document.querySelector<HTMLElement>(".tool-page")?.dataset.tool === name;
  let records = await toolRecords(userId, project.id, tool);
  const screenplayScenes = tool === "shots" || tool === "storyboards" ? (await toolRecords(userId, project.id, "screenplay")).filter(item => item.fields.kind === "Scene Heading") : [];
  if (!isCurrent()) return;
  let selected: string | undefined = records[0]?.id;
  let activeScene = "all";
  let calendarView: "timeline" | "month" | "week" | "day" = "timeline";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let calendarMonth = new Date();
  const savedRevisions = new Map(records.map(record => [record.id, record.revision || 0]));
  let saveQueue = Promise.resolve();
  const ordered = () => [...records].sort((a, b) => (a.fields.order || a.createdAt).localeCompare(b.fields.order || b.createdAt));
  const persist = (record: ToolRecord) => {
    status.textContent = "Saving on this device…";
    const snapshot = { ...record, fields: { ...record.fields }, updatedAt: new Date().toISOString() };
    const task = saveQueue.then(async () => {
      const revision = await saveToolRecord(userId, project.id, tool, snapshot, savedRevisions.get(record.id) || 0);
      savedRevisions.set(record.id, revision);
      record.revision = revision;
      record.updatedAt = snapshot.updatedAt;
      if (isCurrent()) status.textContent = "Saved on this device · Cloud sync is not connected yet";
    });
    saveQueue = task.catch(() => {});
    return task;
  };
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
      const scenes = tool === "screenplay" ? items.filter(record => record.fields.kind === "Scene Heading") : [];
      const sceneNav = tool === "screenplay" ? `<nav class="scene-nav" aria-label="Scene navigator"><h2>Scene navigator <span>${scenes.length}</span></h2>${scenes.length ? scenes.map((record, index) => `<button type="button" class="scene-nav-item ${record.id === selected ? "selected" : ""}" data-select="${record.id}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml((record.fields.text || record.title || "Untitled scene").split("\n")[0])}</button>`).join("") : '<p class="tool-empty">Add a Scene Heading to build your navigator.</p>'}</nav>` : "";
      const elementIndex = items.length ? items.map((record, index) => `<button type="button" class="tool-list-item ${record.id === selected ? "selected" : ""}" data-select="${escapeHtml(record.id)}"><small>${index + 1 < 10 ? `0${index + 1}` : index + 1}${tool === "screenplay" ? ` · ${escapeHtml(record.fields.kind || "Action")}` : ""}</small><strong>${escapeHtml(record.title || "Untitled")}</strong></button>`).join("") : '<p class="tool-empty">Nothing here yet. Create the first item.</p>';
      list.innerHTML = tool === "screenplay" ? `${sceneNav}<details class="script-element-index"><summary>All elements <span>${items.length}</span></summary>${elementIndex}</details>` : `<h2>Items <span>${items.length}</span></h2>${elementIndex}`;
    }
    list.querySelectorAll<HTMLButtonElement>("[data-select]").forEach(button => button.onclick = () => { selected = button.dataset.select; renderList(); renderEditor(); });
    list.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach(button => button.onclick = () => { activeScene = button.dataset.scene || "all"; selected = ordered().find(item => activeScene === "all" || item.fields.sceneId === activeScene)?.id; renderList(); renderEditor(); });
    list.querySelector("#notes-start")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
  };
  const renderEditor = () => {
    const record = records.find(item => item.id === selected);
    const visualBoard = () => {
      const visible = ordered().filter(item => activeScene === "all" || item.fields.sceneId === activeScene);
      const sceneLabel = (item: ToolRecord) => screenplayScenes.find(scene => scene.id === item.fields.sceneId)?.fields.text || "Ungrouped";
      if (tool === "shots") return `<div class="shot-board"><div class="visual-board-head"><strong>Shot list</strong><span>${visible.length} ${visible.length === 1 ? "shot" : "shots"}</span></div><div class="shot-table-wrap"><table class="shot-table"><thead><tr><th>Image</th><th>Shot</th><th>Description</th><th>Shot size</th><th>Shot type</th><th>Movement</th><th>Est. time</th></tr></thead><tbody>${visible.map((item, index) => `<tr class="${item.id === selected ? "selected" : ""}" data-visual-select="${escapeHtml(item.id)}" tabindex="0" aria-label="Edit shot ${index + 1}"><td>${safeImage(item.fields.image || "") ? `<img alt="Shot reference" src="${escapeHtml(safeImage(item.fields.image))}">` : '<span class="shot-image-placeholder">▧</span>'}</td><td><strong>${index + 1}</strong><small>${escapeHtml(sceneLabel(item))}</small></td><td>${escapeHtml(item.fields.description || item.title)}</td><td>${escapeHtml(item.fields.size || "—")}</td><td>${escapeHtml(item.fields.type || "—")}</td><td>${escapeHtml(item.fields.movement || "—")}</td><td>${escapeHtml(item.fields.estimate || "—")}</td></tr>`).join("") || '<tr><td colspan="7" class="visual-board-empty">No shots in this scene. Add one to begin.</td></tr>'}</tbody></table></div></div>`;
      if (tool === "storyboards") return `<div class="storyboard-board"><div class="visual-board-head"><strong>Storyboard</strong><span>${visible.length} ${visible.length === 1 ? "frame" : "frames"}</span></div><div class="storyboard-grid">${visible.map((item, index) => `<button type="button" class="storyboard-card ${item.id === selected ? "selected" : ""}" data-visual-select="${escapeHtml(item.id)}"><span class="storyboard-card-title">${escapeHtml(sceneLabel(item))} · Frame ${index + 1}</span><span class="storyboard-card-image">${safeImage(item.fields.image || "") ? `<img alt="Frame reference" src="${escapeHtml(safeImage(item.fields.image))}">` : '<span aria-hidden="true">▧</span>'}</span><span class="storyboard-card-line">${escapeHtml(item.fields.description || "Description…")}</span><span class="storyboard-card-line">♫ ${escapeHtml(item.fields.sound || "Sound effects…")}</span><span class="storyboard-card-line">▣ ${escapeHtml(item.fields.video || "Video reference…")}</span></button>`).join("") || '<p class="visual-board-empty">No frames in this scene. Add one to begin.</p>'}</div></div>`;
      return "";
    };
    const wireVisualBoard = () => editor.querySelectorAll<HTMLElement>("[data-visual-select]").forEach(item => {
      item.onclick = () => { selected = item.dataset.visualSelect; renderEditor(); };
      item.onkeydown = event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selected = item.dataset.visualSelect; renderEditor(); } };
    });
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
      const cells = Array.from({ length: offset + count }, (_, index) => {
        if (index < offset) return '<div class="calendar-cell muted"></div>';
        const day = index - offset + 1;
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const entries = ordered().filter(item => item.fields.date === date);
        return `<div class="calendar-cell"><strong>${day}</strong>${entries.map(item => `<button type="button" data-calendar-select="${item.id}">${escapeHtml(item.title)}</button>`).join("")}</div>`;
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
      editor.innerHTML = tool === "screenplay" ? `<div class="script-empty-desk"><div class="script-page script-empty-page"><div class="script-page-header"><span>${escapeHtml(project.title)}</span><span>Script draft</span></div><div class="script-empty-invitation"><h2>Start your screenplay</h2><p>Add a scene heading, then build your story one element at a time.</p><button type="button" id="script-start">Add first scene</button></div></div></div>` : `${name === "calendar" ? calendarMarkup() : ""}${tool === "shots" || tool === "storyboards" ? visualBoard() : ""}<div class="tool-empty-state"><span>${tool === "locations" ? "⌖" : tool === "call-sheets" ? "▣" : tool === "notes" ? "▤" : "✦"}</span><h2>${name === "calendar" ? "No shoot days yet." : tool === "locations" ? "Map out your locations" : tool === "call-sheets" ? "Prepare your first call sheet" : tool === "notes" ? "Your documents start here" : "Start with an idea."}</h2><p>${name === "calendar" ? "Add entries in the Schedule tab." : tool === "locations" ? "Record addresses, contacts, permits and access notes." : tool === "call-sheets" ? "Create a daily plan from your schedule." : tool === "notes" ? "Create a document, give it a name and begin writing." : "Create an item to begin."}</p>${name !== "calendar" ? `<button type="button" id="empty-tool-add">＋ ${tool === "notes" ? "New document" : tool === "locations" ? "New location" : tool === "call-sheets" ? "New call sheet" : "Add first item"}</button>` : ""}</div>`;
      editor.querySelector("#script-start")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
      editor.querySelector("#empty-tool-add")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
      wireVisualBoard();
      wireCalendar(); return;
    }
    const dataFields = fields[tool].filter(field => (name !== "calendar" || ["date", "time", "sceneNumbers", "location", "status"].includes(field.key)) && !(tool === "shots" && field.key === "scene"));
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
    if (tool === "shots" || tool === "storyboards") {
      editor.insertAdjacentHTML("afterbegin", visualBoard());
      const fieldGrid = editor.querySelector<HTMLElement>(".tool-fields")!;
      const sceneField = document.createElement("label");
      sceneField.innerHTML = `Scene<select name="sceneId"><option value="">Ungrouped</option>${screenplayScenes.map(scene => `<option value="${escapeHtml(scene.id)}" ${record.fields.sceneId === scene.id ? "selected" : ""}>${escapeHtml(scene.fields.text || scene.title)}</option>`).join("")}</select>`;
      fieldGrid.prepend(sceneField);
      if (tool === "shots") for (const key of ["size", "type", "movement"]) {
        const input = fieldGrid.querySelector<HTMLInputElement>(`input[name="${key}"]`);
        if (input) input.closest("label")!.outerHTML = shotChoice(key, record.fields[key] || "");
      }
      wireVisualBoard();
    }
    wireCalendar();
    const form = editor.querySelector<HTMLFormElement>("#tool-form")!;
    if (tool === "shots") form.querySelectorAll<HTMLSelectElement>("[data-shot-choice]").forEach(choice => choice.addEventListener("change", () => {
      const key = choice.dataset.shotChoice!;
      const input = form.querySelector<HTMLInputElement>(`input[name="${key}"]`)!;
      input.hidden = choice.value !== "custom";
      input.value = choice.value === "custom" ? (shotChoices[key].includes(input.value) ? "" : input.value) : choice.value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      if (choice.value === "custom") input.focus();
    }));
    if (tool === "screenplay") editor.querySelectorAll<HTMLButtonElement>("[data-script-select]").forEach(button => button.onclick = () => { selected = button.dataset.scriptSelect; renderList(); renderEditor(); editor.querySelector<HTMLTextAreaElement>('textarea[name="text"]')?.focus(); });
    if (!snapshot) form.addEventListener("input", () => {
      const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      if ((tool === "shots" || tool === "storyboards") && !values.image && record.fields.image?.startsWith("data:image/")) delete values.image;
      record.title = tool === "screenplay" ? (values.text || "").split("\n")[0].trim().slice(0, 80) || "Untitled element" : values.title || "Untitled";
      if (tool === "screenplay" && values.text !== record.fields.text) {
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        record.fields.comments = JSON.stringify(comments.map(comment => remapTextComment(comment, record.fields.text || "", values.text || "")));
      }
      record.fields = { ...record.fields, ...values };
      record.updatedAt = new Date().toISOString();
      renderList();
      if (name === "calendar") { const board = editor.querySelector(".calendar-board"); if (board) { board.outerHTML = calendarMarkup(); wireCalendar(); } }
      clearTimeout(timer);
      timer = setTimeout(() => persist(record).then(() => {
        if (tool === "shots" || tool === "storyboards") {
          const board = editor.querySelector(".shot-board, .storyboard-board");
          if (board) { board.outerHTML = visualBoard(); wireVisualBoard(); }
        }
      }).catch(error => { status.textContent = `Save failed: ${error.message}`; }), 350);
    });
    editor.querySelector("#tool-remove")?.addEventListener("click", async () => {
      if (!confirm(`Delete “${record.title}”? This cannot be undone.`)) return;
      clearTimeout(timer); await saveQueue; await deleteToolRecord(userId, project.id, tool, record.id);
      savedRevisions.delete(record.id); records = records.filter(item => item.id !== record.id); selected = ordered()[0]?.id;
      status.textContent = "Deleted from this device"; renderList(); renderEditor();
    });
    editor.querySelector("#tool-print")?.addEventListener("click", () => {
      const paper = document.querySelector<HTMLElement>("#tool-print-document")!;
      if (tool === "screenplay") paper.innerHTML = `<h1>${escapeHtml(project.title)}</h1>${ordered().map(item => `<p class="script-print-${(item.fields.kind || "Text").toLowerCase().replaceAll(" ", "-")}">${escapeHtml(item.fields.text || "")}</p>`).join("")}`;
      else paper.innerHTML = `<h1>${escapeHtml(record.title)}</h1>${dataFields.map(field => `<section><h2>${escapeHtml(field.label)}</h2><p>${escapeHtml(record.fields[field.key] || "—")}</p></section>`).join("")}`;
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
      try { record.fields.image = await compressImage(file); await persist(record); renderEditor(); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "Could not save image"; }
    });
    editor.querySelector("#tool-publish")?.addEventListener("click", async () => {
      if (!confirm("Publish this call sheet as a read-only snapshot?")) return;
      clearTimeout(timer); record.fields.published = "true"; record.fields.publishedAt = new Date().toISOString();
      await persist(record); renderEditor();
    });
    if (tool === "screenplay") {
      const area = form.querySelector<HTMLTextAreaElement>('textarea[name="text"]')!;
      form.querySelector<HTMLSelectElement>('select[name="kind"]')!.addEventListener("input", event => {
        const kind = (event.currentTarget as HTMLSelectElement).value;
        const block = form.querySelector<HTMLElement>(".script-block-active")!;
        block.className = `script-block script-block-active script-${kind.toLowerCase().replaceAll(" ", "-")}`;
        block.querySelector<HTMLElement>(".script-block-kind")!.textContent = kind;
      });
      const sizeScriptInput = () => { area.style.height = "0px"; area.style.height = `${Math.max(48, area.scrollHeight)}px`; };
      sizeScriptInput();
      area.addEventListener("input", sizeScriptInput);
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
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        const target = editor.querySelector<HTMLElement>("#tool-comment-list")!;
        target.innerHTML = comments.length ? comments.map(comment => `<article class="tool-comment ${comment.orphaned ? "orphaned" : ""}"><small>${comment.orphaned ? "Orphaned anchor" : escapeHtml(comment.quote)}</small><p>${escapeHtml(comment.body)}</p><button type="button" data-comment="${comment.id}">${comment.resolved ? "Reopen" : "Resolve"}</button></article>`).join("") : '<p class="tool-empty">No comments yet.</p>';
        target.querySelectorAll<HTMLButtonElement>("[data-comment]").forEach(button => button.onclick = () => { const comment = comments.find(item => item.id === button.dataset.comment)!; comment.resolved = !comment.resolved; record.fields.comments = JSON.stringify(comments); persist(record); showComments(); });
      };
      showComments();
      editor.querySelector("#tool-comment-add")?.addEventListener("click", async () => {
        if (!selectedPassage) { status.textContent = "Select script text before adding a comment."; area.focus(); return; }
        const body = editor.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.value.trim();
        if (!body) { status.textContent = "Write a comment first."; return; }
        const comments = JSON.parse(record.fields.comments || "[]") as TextComment[];
        comments.push({ id: crypto.randomUUID(), ...selectedPassage, body, orphaned: false, resolved: false });
        record.fields.comments = JSON.stringify(comments); await persist(record);
        editor.querySelector<HTMLTextAreaElement>("#tool-comment-body")!.value = ""; composer.hidden = true; selectedPassage = null; panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); showComments();
      });
    }
    if (tool === "screenplay") form.addEventListener("keydown", event => {
      if (!((event.ctrlKey && !event.altKey && !event.metaKey) || (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey))) return;
      const index = Number(event.code.match(/^Digit([1-9])$/)?.[1] || event.key) - 1;
      if (index < 0 || index >= screenplayKinds.length) return;
      event.preventDefault(); const select = form.querySelector<HTMLSelectElement>('select[name="kind"]')!;
      select.value = screenplayKinds[index]; select.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  renderList(); renderEditor();
  status.textContent = "Saved on this device · Cloud sync is not connected yet";
  document.querySelector("#tool-add")?.addEventListener("click", async () => {
    if (!premium && (tool === "shots" || tool === "storyboards") && records.length >= 50) { status.textContent = "The Free plan allows 50 active shots and 50 storyboard frames."; return; }
    const prior = records.find(item => item.id === selected);
    const nextKind = records.length === 0 ? "Scene Heading" : prior?.fields.kind === "Character" ? "Dialogue" : "Action";
    const defaults: Record<string, string> = tool === "screenplay" ? { kind: nextKind, text: "" } : tool === "schedule" ? { date: localDateISO(new Date()) } : tool === "shots" || tool === "storyboards" ? { sceneId: activeScene === "all" ? "" : activeScene } : {};
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
    else if (tool === "notes") editor.querySelector<HTMLTextAreaElement>('textarea[name="body"]')?.focus();
    else editor.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  });
}
