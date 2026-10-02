import type { ToolRecord } from './tool-data.js';
/** Merge independent edits, treating plain/rich document bodies as one value. */
export function mergeToolEdits(base: ToolRecord, local: ToolRecord, remote: ToolRecord): ToolRecord | null {
  const merge = (before: string, mine: string, theirs: string) => mine === theirs || theirs === before ? mine : mine === before ? theirs : null;
  const title = merge(base.title, local.title, remote.title);
  if (title === null) return null;
  const fields: Record<string, string> = {};
  const bodyKeys = ['body', 'richBody'];
  const body = (record: ToolRecord) => JSON.stringify(bodyKeys.map(key => record.fields[key] || ''));
  const mergedBody = merge(body(base), body(local), body(remote));
  if (mergedBody === null) return null;
  const bodyValues = JSON.parse(mergedBody) as string[];
  for (const key of new Set([...Object.keys(base.fields), ...Object.keys(local.fields), ...Object.keys(remote.fields)])) {
    const value = bodyKeys.includes(key) ? bodyValues[bodyKeys.indexOf(key)] : merge(base.fields[key] || '', local.fields[key] || '', remote.fields[key] || '');
    if (value === null) return null;
    fields[key] = value;
  }
  return {...local, title, fields, revision: remote.revision};
}
