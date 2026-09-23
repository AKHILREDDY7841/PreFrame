export const elements = [
    { kind: "act", label: "Act" }, { kind: "sceneHeading", label: "Scene Heading" },
    { kind: "action", label: "Action" }, { kind: "character", label: "Character" },
    { kind: "dialogue", label: "Dialogue" }, { kind: "parenthetical", label: "Parenthetical" },
    { kind: "transition", label: "Transition" }, { kind: "shot", label: "Shot" }, { kind: "text", label: "Text" }
];
export function remapAnchor(anchor, map, textAt) {
    const from = map.map(anchor.from, 1);
    const to = map.map(anchor.to, -1);
    return { ...anchor, from, to, orphaned: from >= to || textAt(from, to) !== anchor.quote };
}
