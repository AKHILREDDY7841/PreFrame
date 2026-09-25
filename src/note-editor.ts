import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap, setBlockType, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';

/** The plain-text field remains a portable fallback for older backups and CSV exports. */
export function mountNoteEditor(form: HTMLFormElement, saved: string | undefined): void {
  const source = form.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
  if (!source) return;
  const noteSchema = new Schema({ nodes: schema.spec.nodes, marks: schema.spec.marks });
  let doc;
  try { doc = saved ? noteSchema.nodeFromJSON(JSON.parse(saved)) : undefined; } catch { /* Preserve the plain-text fallback. */ }
  if (!doc) doc = noteSchema.node('doc', null, source.value.split('\n').map(line => noteSchema.node('paragraph', null, line ? noteSchema.text(line) : undefined)));
  const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'richBody'; hidden.value = JSON.stringify(doc.toJSON()); form.append(hidden);
  const toolbar = document.createElement('div'); toolbar.className = 'studio-note-format'; toolbar.setAttribute('role','toolbar'); toolbar.setAttribute('aria-label','Document formatting');
  toolbar.innerHTML = '<select aria-label="Paragraph style"><option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select><button type="button" data-mark="strong" aria-label="Bold"><b>B</b></button><button type="button" data-mark="em" aria-label="Italic"><i>I</i></button><button type="button" data-history="undo">Undo</button><button type="button" data-history="redo">Redo</button>';
  const host = document.createElement('div'); host.className = 'studio-rich-note'; source.before(toolbar,host); source.hidden=true;
  const view = new EditorView(host, {
    state: EditorState.create({schema:noteSchema,doc,plugins:[history(),keymap({'Mod-b':toggleMark(noteSchema.marks.strong),'Mod-i':toggleMark(noteSchema.marks.em),'Mod-z':undo,'Mod-Shift-z':redo}),keymap(baseKeymap)]}),
    attributes:{'aria-label':'Document editor',role:'textbox','aria-multiline':'true'},
    dispatchTransaction(transaction){
      view.updateState(view.state.apply(transaction));
      if(transaction.docChanged){source.value=view.state.doc.textBetween(0,view.state.doc.content.size,'\n');hidden.value=JSON.stringify(view.state.doc.toJSON());source.dispatchEvent(new Event('input',{bubbles:true}));}
    }
  });
  toolbar.querySelectorAll<HTMLButtonElement>('[data-mark]').forEach(button=>button.onmousedown=event=>{event.preventDefault();toggleMark(noteSchema.marks[button.dataset.mark!])(view.state,view.dispatch);view.focus();});
  toolbar.querySelector<HTMLSelectElement>('select')!.onchange=event=>{const level=Number((event.target as HTMLSelectElement).value);setBlockType(level?noteSchema.nodes.heading:noteSchema.nodes.paragraph,level?{level}:null)(view.state,view.dispatch);view.focus();};
  toolbar.querySelectorAll<HTMLButtonElement>('[data-history]').forEach(button=>button.onclick=()=>{(button.dataset.history==='undo'?undo:redo)(view.state,view.dispatch);view.focus();});
  // Destroy detached editors so navigating between documents releases listeners.
  const observer=new MutationObserver(()=>{if(!host.isConnected){view.destroy();observer.disconnect();}});
  observer.observe(document.getElementById('app')!,{childList:true,subtree:true});
}
