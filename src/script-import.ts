export type ImportedScreenplayElement = {
  kind: "Act" | "Scene Heading" | "Action" | "Character" | "Dialogue" | "Parenthetical" | "Transition" | "Shot" | "Text";
  text: string;
};

const sceneHeading = /^(?:\d+\.?\s+)?(?:INT\.?|EXT\.?|INT\.?\s*\/\s*EXT\.?|I\.?\s*\/\s*E\.?|EST\.?)/i;
const transition = /(?:TO:|FADE\s+(?:IN|OUT)|DISSOLVE|SMASH\s+CUT|MATCH\s+CUT|CUT\s+TO)$/i;
const pageNumber = /^\d+\.?$/;
const isUppercaseCue = (value: string) => {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return letters.length > 1 && letters === letters.toUpperCase();
};

/** Converts extracted PDF lines into the familiar screenplay element types. */
export function classifyScreenplayLines(lines: string[]): ImportedScreenplayElement[] {
  const result: ImportedScreenplayElement[] = [];
  let dialogueFollows = false;
  for (const original of lines) {
    const indent = original.length - original.trimStart().length;
    const text = original.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
    if (!text || pageNumber.test(text) || /^(?:copyright|contact info|created using celtx)$/i.test(text)) continue;
    let kind: ImportedScreenplayElement["kind"];
    if (/^ACT\s+(?:[IVX]+|\d+)$/i.test(text)) kind = "Act";
    else if (sceneHeading.test(text)) kind = "Scene Heading";
    else if (transition.test(text) && isUppercaseCue(text)) kind = "Transition";
    else if (/^\(.*\)$/.test(text)) kind = "Parenthetical";
    else if (indent >= 12 && isUppercaseCue(text) && text.length <= 48 && !/[.!?]$/.test(text)) kind = "Character";
    else if (dialogueFollows && indent >= 8) kind = "Dialogue";
    else kind = "Action";
    // PDFs usually extract each visual line separately. Keep screenplay
    // structure, but join wrapped Action and Dialogue lines into the single
    // editable blocks writers expect in a screenplay editor.
    const previous = result.at(-1);
    const canContinue = previous && previous.kind === kind && (kind === "Action" || kind === "Dialogue") && !/[.!?…:]$/.test(previous.text);
    if (canContinue) previous.text += `${previous.text.endsWith("-") ? "" : " "}${text}`;
    else result.push({ kind, text });
    dialogueFollows = kind === "Character" || kind === "Parenthetical" || (kind === "Dialogue" && indent >= 8);
  }
  return result;
}
