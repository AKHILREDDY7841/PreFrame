import assert from 'node:assert/strict';
import test from 'node:test';
import { findScriptText, orderBetween, revisionSceneLabels, sceneIdAt, snapshotScript, wordCount } from '../dist/screenplay-engine.js';

const block = (id, kind, text, order, sceneNumber = '') => ({ id, title: text, fields: { kind, text, order, sceneNumber }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });

test('new screenplay ranks insert between existing elements without renumbering them', () => {
  const inserted = orderBetween('000020', '000021');
  assert.ok('000020' < inserted && inserted < '000021');
  const second = orderBetween('000020', inserted);
  assert.ok('000020' < second && second < inserted);
});

test('screenplay ranks remain ordered through thousands of repeated insertions', () => {
  const ranks = ['000000', '000001'];
  for (let index = 0; index < 5000; index++) {
    const rank = orderBetween(ranks[0], ranks[1]);
    assert.ok(ranks[0] < rank && rank < ranks[1]);
    ranks.splice(1, 0, rank);
  }
  let first = '000000';
  for (let index = 0; index < 100; index++) {
    const rank = orderBetween(undefined, first);
    assert.ok(rank < first);
    first = rank;
  }
});

test('locked revision scenes use suffixes and preserve existing scene labels', () => {
  const headings = [block('a','Scene Heading','INT. HOUSE','1','20'),block('b','Scene Heading','INT. HALL','1U'),block('c','Scene Heading','EXT. STREET','2','21')];
  assert.deepEqual(revisionSceneLabels(headings), ['20','20A','21']);
  headings.splice(2, 0, block('d','Scene Heading','INT. CAR','1UU'));
  assert.deepEqual(revisionSceneLabels(headings), ['20','20A','20B','21']);
});

test('find and word count support mixed Unicode text without case-sensitive duplicates', () => {
  const blocks = [block('a','Action','Akhil says నమస్తే','0'), block('b','Dialogue','अखिल says AKHIL','1')];
  assert.equal(wordCount(blocks), 6);
  assert.deepEqual(findScriptText(blocks, 'akhil').map(match => match.blockId), ['a','b']);
  assert.deepEqual(findScriptText(blocks, 'నమస్తే').map(match => match.blockId), ['a']);
  assert.equal(sceneIdAt([block('scene','Scene Heading','INT. ROOM','0'), ...blocks], 'b'), 'scene');
});

test('snapshots preserve a separate copy of screenplay block data', () => {
  const original = block('a','Action','First line','0');
  const snapshot = snapshotScript([original], 'Original Ending');
  original.fields.text = 'Changed';
  assert.equal(snapshot.blocks[0].fields.text, 'First line');
  assert.equal(snapshot.name, 'Original Ending');
});
