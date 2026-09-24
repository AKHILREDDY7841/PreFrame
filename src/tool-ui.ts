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
  return `<main class="tool-page" data-tool="${escapeHtml(name)}" data-project="${escapeHtml(project.id)}"><div class="tool-topline"><a href="${href(`/app/projects/${project.id}`)}" data-route>← ${escapeHtml(project.title)}</a><span>Project tools</span>${write ? '<button id="eye" type="button" aria-pressed="false">Eye saver</button>' : ""}</div>${toolNavigation(project.id, href)}<div class="tool-heading"><div><p class="eyebrow">${escapeHtml(project.title.toUpperCase())}</p><h1>${label}</h1><p>${name === "calendar" ? "Shoot days from your production schedule." : tool === "call-sheets" ? "Create a call sheet from your schedule, then publish a fixed version." : "Changes on this device save automatically."}</p></div>${name === "calendar" ? "" : `<button id="tool-add" class="button" type="button">＋ ${tool === "screenplay" ? "Add element" : tool === "notes" ? "New note" : tool === "shots" ? "New shot" : tool === "storyboards" ? "New frame" : tool === "schedule" ? "Add schedule entry" : tool === "locations" ? "New location" : "New call sheet"}</button>`}</div><p class="tool-save-status" id="tool-status" role="status">Loading…</p><div class="tool-body"><aside class="tool-list" id="tool-list" aria-label="${label} items"></aside><section class="tool-editor" id="tool-editor" aria-label="Editor"></section></div><article id="tool-print-document" aria-hidden="true"></article></main>`;
}

export async function mountToolWorkspace(project: Project, name: string, userId: string, premium = false): Promise<void> {
  const tool: ToolName = name === "calendar" ? "schedule" : name as ToolName;
  const list = document.querySelector<HTMLElement>("#tool-list")!;
  const editor = document.querySelector<HTMLElement>("#tool-editor")!;
  const status = document.querySelector<HTMLElement>("#tool-status")!;
  const isCurrent = () => document.querySelector<HTMLElement>(".tool-page")?.dataset.project === project.id && document.querySelector<HTMLElement>(".tool-page")?.dataset.tool === name;
  let records = await toolRecords(userId, project.id, tool);
  if (!isCurrent()) return;
  let selected: string | undefined = records[0]?.id;
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
    } else {
      const scenes = tool === "screenplay" ? items.filter(record => record.fields.kind === "Scene Heading") : [];
      const sceneNav = tool === "screenplay" ? `<nav class="scene-nav" aria-label="Scene navigator"><h2>Scene navigator <span>${scenes.length}</span></h2>${scenes.length ? scenes.map((record, index) => `<button type="button" class="scene-nav-item ${record.id === selected ? "selected" : ""}" data-select="${record.id}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml((record.fields.text || record.title || "Untitled scene").split("\n")[0])}</button>`).join("") : '<p class="tool-empty">Add a Scene Heading to build your navigator.</p>'}</nav>` : "";
      const elementIndex = items.length ? items.map((record, index) => `<button type="button" class="tool-list-item ${record.id === selected ? "selected" : ""}" data-select="${escapeHtml(record.id)}"><small>${index + 1 < 10 ? `0${index + 1}` : index + 1}${tool === "screenplay" ? ` · ${escapeHtml(record.fields.kind || "Action")}` : ""}</small><strong>${escapeHtml(record.title || "Untitled")}</strong></button>`).join("") : '<p class="tool-empty">Nothing here yet. Create the first item.</p>';
      list.innerHTML = tool === "screenplay" ? `${sceneNav}<details class="script-element-index"><summary>All elements <span>${items.length}</span></summary>${elementIndex}</details>` : `<h2>Items <span>${items.length}</span></h2>${elementIndex}`;
    }
    list.querySelectorAll<HTMLButtonElement>("[data-select]").forEach(button => button.onclick = () => { selected = button.dataset.select; renderList(); renderEditor(); });
  };
  const renderEditor = () => {
    const record = records.find(item => item.id === selected);
    const calendarMarkup = () => {
      const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
      const offset = new Date(year, month, 1).getDay();
      const count = new Date(year, month + 1, 0).getDate();
      const cells = Array.from({ length: offset + count }, (_, index) => {
        if (index < offset) return '<div class="calendar-cell muted"></div>';
        const day = index - offset + 1;
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const entries = ordered().filter(item => item.fields.date === date);
        return `<div class="calendar-cell"><strong>${day}</strong>${entries.map(item => `<button type="button" data-calendar-select="${item.id}">${escapeHtml(item.title)}</button>`).join("")}</div>`;
      }).join("");
      return `<div class="calendar-board"><div class="calendar-board-head"><button type="button" data-calendar-month="-1">←</button><h2>${calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button type="button" data-calendar-month="1">→</button></div><div class="calendar-grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<span class="calendar-day">${day}</span>`).join("")}${cells}</div></div>`;
    };
    const wireCalendar = () => {
      editor.querySelectorAll<HTMLButtonElement>("[data-calendar-month]").forEach(button => button.onclick = () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + Number(button.dataset.calendarMonth), 1); renderEditor(); });
      editor.querySelectorAll<HTMLButtonElement>("[data-calendar-select]").forEach(button => button.onclick = () => { selected = button.dataset.calendarSelect; renderList(); renderEditor(); });
    };
    if (!record) {
      editor.innerHTML = tool === "screenplay" ? `<div class="script-empty-desk"><div class="script-page script-empty-page"><div class="script-page-header"><span>${escapeHtml(project.title)}</span><span>Script draft</span></div><div class="script-empty-invitation"><h2>Start your screenplay</h2><p>Add a scene heading, then build your story one element at a time.</p><button type="button" id="script-start">Add first scene</button></div></div></div>` : `${name === "calendar" ? calendarMarkup() : ""}<div class="tool-empty-state"><span>✦</span><h2>${name === "calendar" ? "No shoot days yet." : "Start with an idea."}</h2><p>${name === "calendar" ? "Add entries in the Schedule tab." : "Create an item to begin."}</p></div>`;
      editor.querySelector("#script-start")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>("#tool-add")?.click());
      wireCalendar(); return;
    }
    const dataFields = fields[tool].filter(field => name !== "calendar" || ["date", "time", "sceneNumbers", "location", "status"].includes(field.key));
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
    editor.innerHTML = isScript ? screenplayEditorMarkup(project, record, ordered()) : `${name === "calendar" ? calendarMarkup() : ""}<form id="tool-form" class="tool-form"><div class="tool-form-header"><label class="tool-title-label">${isScript ? "Element title" : tool === "schedule" ? "Schedule item" : "Title"}<input name="title" value="${escapeHtml(record.title)}" maxlength="160" ${snapshot ? "readonly" : ""} required></label><div class="tool-form-actions">${tool === "call-sheets" && !snapshot ? '<button type="button" id="tool-publish">Publish version</button>' : ""}${(isScript || tool === "shots" || tool === "storyboards") && !snapshot ? '<button type="button" id="tool-up" aria-label="Move item up">↑</button><button type="button" id="tool-down" aria-label="Move item down">↓</button>' : ""}<button type="button" id="tool-print">Print / PDF</button>${name !== "calendar" && !snapshot ? '<button type="button" id="tool-remove" class="danger-text">Delete</button>' : ""}</div></div>${snapshot ? '<p class="tool-published">Published snapshot · This version is read only.</p>' : ""}<div class="tool-fields">${dataFields.map(field => `<label>${escapeHtml(field.label)}${field.key === "kind" ? `<select name="kind">${screenplayKinds.map(kind => `<option value="${escapeHtml(kind)}" ${record.fields.kind === kind ? "selected" : ""}>${escapeHtml(kind)}</option>`).join("")}</select>` : ["text", "body", "description", "notes", "schedule"].includes(field.key) ? `<textarea name="${field.key}" rows="${field.key === "text" || field.key === "body" ? 13 : 4}" ${snapshot ? "readonly" : ""}>${escapeHtml(valueFor(field.key))}</textarea>` : `<input name="${field.key}" type="${field.type || "text"}" value="${escapeHtml(valueFor(field.key))}" ${snapshot ? "readonly" : ""}>`}</label>`).join("")}</div>${isScript ? '<p class="script-shortcuts">Format element: Ctrl+1–9, or Alt+Shift+1–9 if your browser uses Ctrl+number. The menu above works on touch devices.</p>' : ""}${(tool === "shots" || tool === "storyboards") ? `<div class="tool-image-upload"><label>Upload reference image <input id="tool-image-file" type="file" accept="image/*"></label>${safeImage(record.fields.image || "") ? `<img alt="Reference image" src="${escapeHtml(safeImage(record.fields.image))}">` : ""}</div>` : ""}${isScript ? '<section class="tool-comments"><h2>Comments</h2><label>Comment on selected script text<textarea id="tool-comment-body" rows="2" placeholder="Leave a note for your crew"></textarea></label><button type="button" id="tool-comment-add">Add comment</button><div id="tool-comment-list"></div></section>' : ""}</form>`;
    wireCalendar();
    const form = editor.querySelector<HTMLFormElement>("#tool-form")!;
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
      timer = setTimeout(() => persist(record).catch(error => { status.textContent = `Save failed: ${error.message}`; }), 350);
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
    const defaults: Record<string, string> = tool === "screenplay" ? { kind: nextKind, text: "" } : tool === "schedule" ? { date: localDateISO(new Date()) } : {};
    const title = tool === "screenplay" ? "Untitled element" : tool === "notes" ? "Untitled note" : tool === "shots" ? "New shot" : tool === "storyboards" ? "New frame" : tool === "schedule" ? "New schedule item" : tool === "locations" ? "New location" : "Call sheet draft";
    const record = newToolRecord(title, defaults);
    record.fields.order = String(records.length).padStart(6, "0");
    if (tool === "call-sheets") {
      const schedule = await toolRecords(userId, project.id, "schedule");
      record.fields.schedule = schedule.map(item => `${item.fields.date || ""} ${item.fields.time || item.fields.start || ""} ${item.title} — ${item.fields.location || ""}`).join("\n");
    }
    records.push(record); selected = record.id; await persist(record); renderList(); renderEditor();
    if (tool === "screenplay") editor.querySelector<HTMLTextAreaElement>('textarea[name="text"]')?.focus();
    else editor.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  });
}
