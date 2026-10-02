import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { EditorState, TextSelection, NodeSelection, type Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap, setBlockType, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';

/** The plain-text field remains a portable fallback for older backups and CSV exports. */
export function mountNoteEditor(form: HTMLFormElement, saved: string | undefined): void {
  const source = form.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
  if (!source) return;
  const noteSchema = new Schema({ nodes: schema.spec.nodes.update('image', {
    inline: false, group: 'block', atom: true, draggable: true,
    attrs: {src: {}, alt: {default: ''}, title: {default: null}, width: {default: 100}},
    parseDOM: [{tag: 'img[src]', getAttrs: element => {
      const image = element as HTMLImageElement;
      const src = image.getAttribute('src') || '';
      if (!/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(src)) return false;
      return {src, alt: image.alt, title: image.title || null, width: Math.min(100, Math.max(10, Number(image.dataset.noteWidth) || 100))};
    }}],
    toDOM: node => ['img', {src: node.attrs.src, alt: node.attrs.alt, title: node.attrs.title, 'data-note-width': node.attrs.width, style: `width:${Math.min(100, Math.max(10, Number(node.attrs.width) || 100))}%;max-width:100%;height:auto`}]
  }), marks: schema.spec.marks });
  let doc;
  try { doc = saved ? noteSchema.nodeFromJSON(JSON.parse(saved)) : undefined; } catch { /* Preserve the plain-text fallback. */ }
  if (!doc) doc = noteSchema.node('doc', null, source.value.split('\n').map(line => noteSchema.node('paragraph', null, line ? noteSchema.text(line) : undefined)));
  const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'richBody'; hidden.value = JSON.stringify(doc.toJSON()); form.append(hidden);
  const toolbar = document.createElement('div'); toolbar.className = 'studio-note-format'; toolbar.setAttribute('role','toolbar'); toolbar.setAttribute('aria-label','Document formatting');
  toolbar.innerHTML = '<select aria-label="Paragraph style"><option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select><button type="button" data-mark="strong" aria-label="Bold"><b>B</b></button><button type="button" data-mark="em" aria-label="Italic"><i>I</i></button><button type="button" data-history="undo">Undo</button><button type="button" data-history="redo">Redo</button><span class="studio-note-image-controls" hidden><label>Image size <input type="range" min="10" max="100" step="5" value="100" aria-label="Image width percent"></label><output>100%</output><button type="button" data-image-below>Write below image</button></span><span class="studio-note-image-status" role="status"></span>';
  const host = document.createElement('div'); host.className = 'studio-rich-note'; source.before(toolbar,host); source.hidden=true;
  const style = toolbar.querySelector<HTMLSelectElement>('select')!;
  const imageControls = toolbar.querySelector<HTMLElement>('.studio-note-image-controls')!;
  const imageSize = imageControls.querySelector<HTMLInputElement>('input')!;
  const imageStatus = toolbar.querySelector<HTMLElement>('.studio-note-image-status')!;
  host.append(imageControls);
  const selectionTools = document.createElement('div');
  selectionTools.className = 'studio-note-selection-tools'; selectionTools.hidden = true;
  selectionTools.setAttribute('role', 'toolbar'); selectionTools.setAttribute('aria-label', 'Selected text formatting');
  selectionTools.innerHTML = '<button type="button" data-link aria-label="Add or edit link">↗</button><button type="button" data-mark="strong" aria-label="Bold selected text"><b>B</b></button><button type="button" data-mark="em" aria-label="Italic selected text"><i>I</i></button><select aria-label="Selected text style"><option value="0">Text</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select><div class="studio-note-link-edit" hidden><input type="url" aria-label="Link URL" placeholder="https://…"><button type="button" data-link-save>Apply</button><button type="button" data-link-remove>Remove</button><span role="status"></span></div>';
  host.append(selectionTools);
  let overlayFrame = 0;
  const scheduleOverlays = () => { cancelAnimationFrame(overlayFrame); overlayFrame = requestAnimationFrame(positionOverlays); };
  const positionOverlays = () => {
    if (!host.isConnected) return;
    const scroll = form.closest<HTMLElement>('.tool-editor')!;
    const bounds = scroll.getBoundingClientRect(), origin = host.getBoundingClientRect();
    const selection = view.state.selection;
    const imageSelected = selection instanceof NodeSelection && selection.node.type === noteSchema.nodes.image;
    imageControls.hidden = !imageSelected;
    selectionTools.hidden = imageSelected || selection.empty;
    const place = (panel: HTMLElement, rect: {left: number; top: number; bottom: number; right: number}, image: boolean) => {
      if (rect.bottom < bounds.top || rect.top > bounds.bottom) { panel.hidden = true; return; }
      const width = panel.offsetWidth, height = panel.offsetHeight;
      const left = Math.max(origin.left + 4, Math.min(rect.left, origin.right - width - 4));
      const top = image ? Math.max(rect.top, rect.bottom - height - 8) : rect.top - height - 8;
      panel.style.left = `${left - origin.left}px`;
      panel.style.top = `${Math.max(bounds.top + 4, Math.min(top, bounds.bottom - height - 4)) - origin.top}px`;
    };
    if (imageSelected) {
      const image = view.nodeDOM(selection.from) as HTMLElement | null;
      if (image) place(imageControls, image.getBoundingClientRect(), true);
    } else if (!selection.empty) {
      const start = view.coordsAtPos(selection.from), end = view.coordsAtPos(selection.to);
      place(selectionTools, {left: start.left, right: end.right, top: start.top, bottom: end.bottom}, false);
      const marks = view.state.doc.rangeHasMark(selection.from, selection.to, noteSchema.marks.strong);
      selectionTools.querySelector('[data-mark="strong"]')!.setAttribute('aria-pressed', String(marks));
      selectionTools.querySelector('[data-mark="em"]')!.setAttribute('aria-pressed', String(view.state.doc.rangeHasMark(selection.from, selection.to, noteSchema.marks.em)));
      selectionTools.querySelector<HTMLSelectElement>('select')!.value = style.value;
    }
  };
  const pendingPastes = new Set<(mapping: Transaction['mapping']) => void>();
  const view = new EditorView(host, {
    handlePaste(_view, event) {
      const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);
      if (!files.length) return false;
      event.preventDefault();
      // Keep a mapped bookmark: asynchronous decoding must not steal a later caret.
      let bookmark = view.state.selection.getBookmark();
      const mapPaste = (mapping: Transaction['mapping']) => { bookmark = bookmark.map(mapping); };
      pendingPastes.add(mapPaste);
      imageStatus.textContent = 'Adding image…';
      (async () => {
        try {
          for (const file of files) {
            if (file.size > 20 * 1024 * 1024) throw new Error('Use an image smaller than 20 MB.');
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
            if (!host.isConnected) return;
            const image = noteSchema.nodes.image.create({src: canvas.toDataURL('image/webp', .85), alt: file.name, width: 100});
            const selection = bookmark.resolve(view.state.doc);
            const currentSelection = view.state.selection;
            const stillAtPaste = currentSelection.eq(selection);
            const tr = view.state.tr.setSelection(selection).replaceSelectionWith(image);
            let after = tr.selection.to;
            tr.doc.descendants((node, pos) => { if (node === image) after = pos + node.nodeSize; });
            if (tr.doc.nodeAt(after)?.type !== noteSchema.nodes.paragraph) tr.insert(after, noteSchema.nodes.paragraph.create());
            tr.setSelection(stillAtPaste ? TextSelection.create(tr.doc, after + 1) : currentSelection.map(tr.doc, tr.mapping));
            view.dispatch(stillAtPaste ? tr.scrollIntoView() : tr);
            if (stillAtPaste) view.focus();
          }
          imageStatus.textContent = 'Image added. Click it to resize.';
        } catch (error) { imageStatus.textContent = error instanceof Error ? error.message : 'Could not paste this image. Try copying the image itself.'; }
        finally { pendingPastes.delete(mapPaste); }
      })();
      return true;
    },
    state: EditorState.create({schema:noteSchema,doc,plugins:[history(),keymap({'Mod-b':toggleMark(noteSchema.marks.strong),'Mod-i':toggleMark(noteSchema.marks.em),'Mod-z':undo,'Mod-y':redo,'Mod-Shift-z':redo}),keymap(baseKeymap)]}),
    attributes:{'aria-label':'Document editor',role:'textbox','aria-multiline':'true'},
    dispatchTransaction(transaction){
      pendingPastes.forEach(map => map(transaction.mapping));
      view.updateState(view.state.apply(transaction));
      const selectedImage = view.state.selection instanceof NodeSelection && view.state.selection.node.type === noteSchema.nodes.image;
      imageControls.hidden = !selectedImage;
      if (selectedImage) { imageSize.value = String((view.state.selection as NodeSelection).node.attrs.width); imageControls.querySelector('output')!.textContent = `${imageSize.value}%`; }
      scheduleOverlays();
      const block = view.state.selection.$from.parent;
      style.value = block.type === noteSchema.nodes.heading ? String(block.attrs.level) : '0';
      if(transaction.docChanged){source.value=view.state.doc.textBetween(0,view.state.doc.content.size,'\n');hidden.value=JSON.stringify(view.state.doc.toJSON());source.dispatchEvent(new Event('input',{bubbles:true}));}
    }
  });
  imageSize.oninput = () => {
    const selection = view.state.selection;
    if (!(selection instanceof NodeSelection) || selection.node.type !== noteSchema.nodes.image) return;
    view.dispatch(view.state.tr.setNodeMarkup(selection.from, undefined, {...selection.node.attrs, width: Number(imageSize.value)}));
  };
  imageControls.querySelector<HTMLButtonElement>('[data-image-below]')!.onclick = () => {
    const selection = view.state.selection;
    if (!(selection instanceof NodeSelection)) return;
    const pos = selection.to;
    const tr = view.state.tr;
    if (tr.doc.nodeAt(pos)?.type !== noteSchema.nodes.paragraph) tr.insert(pos, noteSchema.nodes.paragraph.create());
    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, pos + 1)).scrollIntoView()); view.focus();
  };
  selectionTools.addEventListener('mousedown', event => {
    if ((event.target as Element).closest('button')) event.preventDefault();
  });
  selectionTools.querySelectorAll<HTMLButtonElement>('[data-mark]').forEach(button => {
    button.onclick = () => { toggleMark(noteSchema.marks[button.dataset.mark!])(view.state, view.dispatch); view.focus(); };
  });
  selectionTools.querySelector<HTMLSelectElement>('select')!.onchange = event => {
    const level = Number((event.target as HTMLSelectElement).value);
    setBlockType(level ? noteSchema.nodes.heading : noteSchema.nodes.paragraph, level ? {level} : null)(view.state, view.dispatch); view.focus();
  };
  const linkEdit = selectionTools.querySelector<HTMLElement>('.studio-note-link-edit')!;
  const linkInput = linkEdit.querySelector<HTMLInputElement>('input')!;
  selectionTools.querySelector<HTMLButtonElement>('[data-link]')!.onclick = () => {
    linkEdit.hidden = !linkEdit.hidden;
    if (!linkEdit.hidden) {
      let href = ''; view.state.doc.nodesBetween(view.state.selection.from, view.state.selection.to, node => { const link = node.marks.find(mark => mark.type === noteSchema.marks.link); if (link) href = link.attrs.href; });
      linkInput.value = href; linkInput.focus();
    }
    scheduleOverlays();
  };
  const applyLink = (remove: boolean) => {
    const href = linkInput.value.trim();
    if (!remove && !/^(https?:\/\/|mailto:)/i.test(href)) { linkEdit.querySelector('span')!.textContent = 'Use an https:// or mailto: link.'; return; }
    const {from, to} = view.state.selection;
    if (from === to) return;
    const tr = view.state.tr.removeMark(from, to, noteSchema.marks.link);
    if (!remove) tr.addMark(from, to, noteSchema.marks.link.create({href}));
    view.dispatch(tr); linkEdit.hidden = true; view.focus(); scheduleOverlays();
  };
  selectionTools.querySelector<HTMLButtonElement>('[data-link-save]')!.onclick = () => applyLink(false);
  selectionTools.querySelector<HTMLButtonElement>('[data-link-remove]')!.onclick = () => applyLink(true);
  linkInput.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); applyLink(false); } if (event.key === 'Escape') { linkEdit.hidden = true; view.focus(); scheduleOverlays(); } };
  const sheetScroll = form.closest<HTMLElement>('.tool-editor')!;
  sheetScroll.addEventListener('scroll', scheduleOverlays, {passive: true});
  window.addEventListener('resize', scheduleOverlays);
  view.dom.addEventListener('mouseup', scheduleOverlays);
  view.dom.addEventListener('keyup', scheduleOverlays);
  const initialBlock = view.state.selection.$from.parent;
  style.value = initialBlock.type === noteSchema.nodes.heading ? String(initialBlock.attrs.level) : '0';
  const focusEnd = () => {
    view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)));
    view.focus();
  };
  const paper = form.querySelector<HTMLElement>('.studio-note-paper')!;
  paper.addEventListener('mousedown', event => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.tool-form-header,.studio-note-format,.studio-note-selection-tools,.studio-note-image-controls,.ProseMirror')) return;
    if (event.clientY < view.dom.getBoundingClientRect().top) return;
    event.preventDefault();
    focusEnd();
  });
  form.querySelector<HTMLInputElement>('input[name="title"]')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); focusEnd(); }
  });
  toolbar.querySelectorAll<HTMLButtonElement>('[data-mark]').forEach(button=>{
    button.onmousedown=event=>event.preventDefault();
    button.onclick=()=>{toggleMark(noteSchema.marks[button.dataset.mark!])(view.state,view.dispatch);view.focus();};
  });
  style.onchange=event=>{const level=Number((event.target as HTMLSelectElement).value);setBlockType(level?noteSchema.nodes.heading:noteSchema.nodes.paragraph,level?{level}:null)(view.state,view.dispatch);view.focus();};
  toolbar.querySelectorAll<HTMLButtonElement>('[data-history]').forEach(button=>button.onclick=()=>{(button.dataset.history==='undo'?undo:redo)(view.state,view.dispatch);view.focus();});
  // Destroy detached editors so navigating between documents releases listeners.
  const observer=new MutationObserver(()=>{if(!host.isConnected){cancelAnimationFrame(overlayFrame); window.removeEventListener('resize', scheduleOverlays); view.destroy();observer.disconnect();}});
  observer.observe(document.getElementById('app')!,{childList:true,subtree:true});
}
