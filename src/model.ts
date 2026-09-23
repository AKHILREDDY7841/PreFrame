export type ElementKind = "act" | "sceneHeading" | "action" | "character" | "dialogue" | "parenthetical" | "transition" | "shot" | "text";

export const elements: ReadonlyArray<{ kind: ElementKind; label: string }> = [
  { kind: "act", label: "Act" }, { kind: "sceneHeading", label: "Scene Heading" },
  { kind: "action", label: "Action" }, { kind: "character", label: "Character" },
  { kind: "dialogue", label: "Dialogue" }, { kind: "parenthetical", label: "Parenthetical" },
  { kind: "transition", label: "Transition" }, { kind: "shot", label: "Shot" }, { kind: "text", label: "Text" }
];

export type Anchor = { from: number; to: number; quote: string; orphaned: boolean };

export function remapAnchor(anchor: Anchor, map: { map(pos: number, assoc?: number): number }, textAt: (from: number, to: number) => string): Anchor {
  const from = map.map(anchor.from, 1);
  const to = map.map(anchor.to, -1);
  return { ...anchor, from, to, orphaned: from >= to || textAt(from, to) !== anchor.quote };
}
