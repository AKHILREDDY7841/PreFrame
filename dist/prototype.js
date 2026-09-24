import { Schema } from "prosemirror-model";
import { EditorState, Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { elements, remapAnchor } from "./model.js";
const uid = () => crypto.randomUUID();
const node = (id, text) => ({ id, text });
const initial = [
    ["act", node("block-act-001", "ACT ONE")],
    ["sceneHeading", node("scene-7c2d", "INT. EDITING ROOM - NIGHT")],
    ["action", node("block-action-001", "Rain ticks against the window. Maya studies the cut in silence.")],
    ["character", node("block-char-001", "MAYA")],
    ["dialogue", node("block-dialogue-001", "Let us keep the English line with తెలుగు together.")],
    ["parenthetical", node("block-parenthetical-001", "(quietly)")],
    ["dialogue", node("block-dialogue-002", "مرحبا بالعالم — 日本語入力 — 안녕하세요")],
    ["shot", node("block-shot-001", "CLOSE ON: the timeline cursor")],
    ["transition", node("block-transition-001", "CUT TO:")],
    ["text", node("block-text-001", "Production note: verify the exported text is selectable.")]
];
const blockSpec = (kind) => ({
    content: "inline*", group: "block", attrs: { id: { default: "" } },
    toDOM: (n) => ["div", { class: `element element-${kind}`, "data-element": kind, "data-block-id": n.attrs.id }, 0],
    parseDOM: [{ tag: `div[data-element='${kind}']`, getAttrs: (dom) => ({ id: dom.dataset.blockId || uid() }) }]
});
const nodes = { doc: { content: "block+" }, text: { group: "inline" } };
for (const { kind } of elements)
    nodes[kind === "text" ? "generalText" : kind] = blockSpec(kind);
const schema = new Schema({ nodes });
const nodeName = (kind) => kind === "text" ? "generalText" : kind;
const doc = schema.node("doc", null, initial.map(([kind, value]) => schema.node(nodeName(kind), { id: value.id }, value.text ? schema.text(value.text) : undefined)));
let comments = [];
let shortcutMode = "ctrl";
const sceneList = document.querySelector("#scene-list");
const commentList = document.querySelector("#comment-list");
const menu = document.querySelector("#element-menu");
const commentText = document.querySelector("#comment-text");
const mode = document.querySelector("#shortcut-mode");
for (const [index, item] of elements.entries())
    menu.add(new Option(`${index + 1}. ${item.label}`, item.kind));
function textAt(state, from, to) { return state.doc.textBetween(from, to, " "); }
function renderComments() {
    commentList.replaceChildren(...comments.map((comment) => {
        const card = document.createElement("article");
        card.className = `comment ${comment.orphaned ? "orphaned" : ""}`;
        card.innerHTML = `<p><mark>${comment.orphaned ? "Orphaned anchor" : comment.quote}</mark></p><p>${comment.body}</p><small>${comment.blockId}</small><button type="button">${comment.resolved ? "Reopen" : "Resolve"}</button>`;
        card.querySelector("button").onclick = () => { comment.resolved = !comment.resolved; renderComments(); };
        return card;
    }));
    if (!comments.length)
        commentList.textContent = "No comments yet.";
}
function renderNavigator(state) {
    sceneList.replaceChildren();
    state.doc.descendants((n, pos) => {
        if (n.type.name !== "sceneHeading")
            return;
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = n.textContent;
        button.title = `Stable ID: ${n.attrs.id}`;
        button.onclick = () => { view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos + 1)))); view.focus(); };
        item.append(button);
        sceneList.append(item);
    });
}
function shortcutBindings() {
    const result = {};
    elements.forEach(({ kind }, index) => {
        const key = shortcutMode === "ctrl" ? `Ctrl-${index + 1}` : `Alt-Shift-${index + 1}`;
        result[key] = () => changeBlock(kind);
    });
    return result;
}
function changeBlock(kind) {
    const { state } = view;
    const $from = state.selection.$from;
    const old = $from.parent;
    if (!old.isBlock)
        return false;
    const pos = $from.before($from.depth);
    view.dispatch(state.tr.setNodeMarkup(pos, schema.nodes[nodeName(kind)], { ...old.attrs, id: old.attrs.id || uid() }));
    return true;
}
const commentPlugin = new Plugin({
    props: { decorations(state) { return DecorationSet.create(state.doc, comments.filter((comment) => !comment.orphaned).map((comment) => Decoration.inline(comment.from, comment.to, { class: "comment-anchor" }))); } },
    appendTransaction(transactions, oldState, newState) {
        let touched = false;
        for (const tr of transactions)
            if (tr.docChanged) {
                comments = comments.map((c) => { const anchor = remapAnchor(c, tr.mapping, (from, to) => textAt(newState, from, to)); return { ...c, ...anchor, blockId: newState.doc.resolve(anchor.from).parent.attrs.id || c.blockId }; });
                touched = true;
            }
        if (touched)
            renderComments();
        return null;
    }
});
const state = EditorState.create({ schema, doc, plugins: [history(), keymap(shortcutBindings()), keymap(baseKeymap), commentPlugin] });
const view = new EditorView(document.querySelector("#editor"), { state, dispatchTransaction(tr) { view.updateState(view.state.apply(tr)); renderNavigator(view.state); } });
renderNavigator(view.state);
renderComments();
menu.onchange = () => changeBlock(menu.value);
mode.onchange = () => { shortcutMode = mode.value; view.setProps({ state: view.state.reconfigure({ plugins: [history(), keymap(shortcutBindings()), keymap(baseKeymap), commentPlugin] }) }); };
document.querySelector("#undo").onclick = () => undo(view.state, view.dispatch);
document.querySelector("#redo").onclick = () => redo(view.state, view.dispatch);
document.querySelector("#comment").onclick = () => {
    const { from, to } = view.state.selection;
    const quote = textAt(view.state, from, to);
    if (!quote) {
        commentText.focus();
        commentText.placeholder = "Select words in the screenplay first.";
        return;
    }
    comments.push({ id: uid(), blockId: view.state.selection.$from.parent.attrs.id, from, to, quote, body: commentText.value.trim() || "Review this passage.", resolved: false, orphaned: false });
    commentText.value = "";
    view.updateState(view.state);
    renderComments();
};
document.querySelector("#print").onclick = () => window.print();
document.querySelector("#image-input").onchange = async (event) => {
    const input = event.currentTarget;
    const file = (input.files || [])[0];
    const output = document.querySelector("#benchmark-result");
    if (!file)
        return;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    const compressed = blob?.size || 0;
    const ratio = ((1 - compressed / file.size) * 100).toFixed(1);
    const fits = Math.floor((6 * 1024 * 1024) / Math.max(compressed, 1));
    output.textContent = `${file.name}: ${(file.size / 1024).toFixed(1)} KB → ${(compressed / 1024).toFixed(1)} KB (${ratio}% smaller), ${canvas.width}×${canvas.height}; about ${fits} comparable images fit in 6 MB.`;
};
