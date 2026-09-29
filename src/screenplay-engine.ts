import type { ToolRecord } from './tool-data.js';

export type ScriptBlock = Pick<ToolRecord, 'id' | 'title' | 'fields' | 'createdAt' | 'updatedAt'>;
export type ScriptSnapshot = { id: string; name: string; createdAt: string; blocks: ScriptBlock[] };
export type ScriptMatch = { blockId: string; from: number; to: number };

const alphabet = '!0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Lexicographic rank between adjacent records; legacy six-digit ranks remain valid. */
export function orderBetween(before: string | undefined, after: string | undefined): string {
  if (!before) {
    if (!after) return '000000';
    return '!' + after;
  }
  if (!after) return before + 'U';
  if (before >= after) throw new Error('Screenplay order is inconsistent');
  let index = 0;
  while (before[index] === after[index] && index < before.length) index++;
  if (index === before.length) {
    const next = alphabet.indexOf(after[index]);
    if (next < 0) throw new Error('Unsupported screenplay order');
    if (next === 0) {
      if (index + 1 === after.length) throw new Error('No rank between adjacent screenplay blocks');
      return before + '!' + orderBetween(undefined, after.slice(index + 1));
    }
    const midpoint = Math.floor(next / 2);
    const prefix = before + alphabet[midpoint];
    return midpoint === 0 ? prefix + 'U' : prefix;
  }
  const a = alphabet.indexOf(before[index]);
  const b = alphabet.indexOf(after[index]);
  if (a < 0 || b < 0) throw new Error('Unsupported screenplay order');
  if (b - a > 1) return before.slice(0, index) + alphabet[Math.floor((a + b) / 2)];
  return before + 'U';
}

export function wordCount(blocks: ScriptBlock[]): number {
  return blocks.reduce((total, block) => total + (block.fields.text || '').trim().split(/\s+/u).filter(Boolean).length, 0);
}

export function findScriptText(blocks: ScriptBlock[], query: string, matchCase = false): ScriptMatch[] {
  if (!query) return [];
  const needle = matchCase ? query : query.toLocaleLowerCase();
  const matches: ScriptMatch[] = [];
  for (const block of blocks) {
    const text = block.fields.text || '';
    const haystack = matchCase ? text : text.toLocaleLowerCase();
    let offset = 0;
    while ((offset = haystack.indexOf(needle, offset)) !== -1) {
      matches.push({ blockId: block.id, from: offset, to: offset + query.length });
      offset += Math.max(query.length, 1);
    }
  }
  return matches;
}

export function snapshotScript(blocks: ScriptBlock[], name: string): ScriptSnapshot {
  return { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), blocks: blocks.map(block => ({ id: block.id, title: block.title, fields: { ...block.fields }, createdAt: block.createdAt, updatedAt: block.updatedAt })) };
}

const letterSuffix = (index: number): string => {
  let n = index;
  let result = '';
  do { result = String.fromCharCode(65 + n % 26) + result; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return result;
};

/** Existing scene labels never change in revision mode; new headings gain suffixes. */
export function revisionSceneLabels(headings: ScriptBlock[]): string[] {
  const used = new Set(headings.map(heading => heading.fields.sceneNumber).filter(Boolean));
  return headings.map((heading, index) => {
    if (heading.fields.sceneNumber) return heading.fields.sceneNumber;
    const prior = [...headings.slice(0, index)].reverse().find(item => item.fields.sceneNumber)?.fields.sceneNumber;
    const following = headings.slice(index + 1).find(item => item.fields.sceneNumber)?.fields.sceneNumber;
    if (!prior && !following) return String(index + 1);
    if (!prior) {
      const base = Math.max(0, Number.parseInt(following!, 10) - 1);
      let suffix = 0;
      while (used.has(`${base}${letterSuffix(suffix)}`)) suffix++;
      const label = `${base}${letterSuffix(suffix)}`; used.add(label); return label;
    }
    const base = Number.parseInt(prior, 10);
    if (!following) {
      const next = String(base + 1);
      if (!used.has(next)) { used.add(next); return next; }
    }
    let suffix = 0;
    while (used.has(`${base}${letterSuffix(suffix)}`)) suffix++;
    const label = `${base}${letterSuffix(suffix)}`; used.add(label); return label;
  });
}

export function sceneIdAt(blocks: ScriptBlock[], blockId: string): string | undefined {
  let sceneId: string | undefined;
  for (const block of blocks) {
    if (block.fields.kind === 'Scene Heading') sceneId = block.id;
    if (block.id === blockId) return sceneId;
  }
  return undefined;
}
