import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeToolEdits} from '../dist/tool-save.js';
const base = {id:'note',title:'Plan',fields:{body:'Original',richBody:'original-rich',checklist:'One'},revision:1,createdAt:'2026-10-02',updatedAt:'2026-10-02'};
const change = (fields, revision=1) => ({...base,fields:{...base.fields,...fields},revision});
test('independent document and checklist edits merge without losing either',()=>{
 const merged=mergeToolEdits(base,change({body:'New',richBody:'new-rich'}),change({checklist:'Two'},2));
 assert.equal(merged.fields.body,'New'); assert.equal(merged.fields.richBody,'new-rich'); assert.equal(merged.fields.checklist,'Two'); assert.equal(merged.revision,2);
});
test('same content with a newer revision rebases rather than reporting a conflict',()=>{
 assert.equal(mergeToolEdits(base,change({body:'New',richBody:'new-rich'}),change({},3)).revision,3);
});
test('competing document bodies require preserving a separate recovered version',()=>{
 assert.equal(mergeToolEdits(base,change({body:'Mine',richBody:'mine-rich'}),change({body:'Theirs',richBody:'their-rich'},2)),null);
});
test('plain and rich document bodies cannot be combined from different versions',()=>{
 assert.equal(mergeToolEdits(base,change({body:'Mine'}),change({richBody:'their-rich'},2)),null);
 assert.equal(mergeToolEdits(base,{...base,title:'Mine'},{...base,title:'Theirs',revision:2}),null);
});

import {retryTransient} from '../dist/request-state.js';
import {sameToolContent} from '../dist/tool-data.js';
test('aborted sync retries and acknowledges a later successful attempt',async()=>{
 let attempts=0;
 assert.equal(await retryTransient(async()=>{if(++attempts<3)throw new Error('AbortError: signal is aborted');return 42;},[0,0]),42);
 assert.equal(attempts,3);
});
test('sync never retries permission failures or retries transient failures forever',async()=>{
 let attempts=0; await assert.rejects(retryTransient(async()=>{attempts++;throw new Error('permission denied');},[0,0]),/denied/);assert.equal(attempts,1);
 attempts=0;await assert.rejects(retryTransient(async()=>{attempts++;throw new Error('network disconnected');},[0,0]),/network/);assert.equal(attempts,3);
});
test('lost sync acknowledgements compare content without relying on JSON key order',()=>{
 assert.equal(sameToolContent(base,{...base,revision:5,fields:{checklist:'One',richBody:'original-rich',body:'Original'}}),true);
 assert.equal(sameToolContent(base,change({richBody:'different'})),false);
});
