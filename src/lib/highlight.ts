export type TokenType =
  | "text"
  | "heading"
  | "bold"
  | "italic"
  | "code"
  | "link"
  | "list"
  | "blockquote"
  | "scene-heading"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "action"
  | "transition";

export interface HighlightToken {
  text: string;
  type: TokenType;
}

export function highlightLine(
  line: string,
  mode: "markdown" | "screenplay" | "novel"
): HighlightToken[] {
  if (mode === "screenplay") {
    return highlightScreenplayLine(line);
  }
  if (mode === "novel") {
    return highlightNovelLine(line);
  }
  return highlightMarkdownLine(line);
}

function highlightNovelLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];

  // Chapter headings
  if (/^(cap[ií]tulo|chapter|parte|part)\s+/i.test(line.trim())) {
    tokens.push({ text: line, type: "heading" });
    return tokens;
  }

  // Scene breaks (*** or ---)
  if (/^(\*{3,}|-{3,})$/.test(line.trim())) {
    tokens.push({ text: line, type: "transition" });
    return tokens;
  }

  // Default prose
  if (line.length === 0) {
    tokens.push({ text: "", type: "text" });
    return tokens;
  }

  tokens.push({ text: line, type: "text" });
  return tokens;
}

function highlightMarkdownLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];

  // Headings
  const headingMatch = line.match(/^(#{1,6}) (.*)$/);
  if (headingMatch) {
    tokens.push({ text: headingMatch[1] + " ", type: "heading" });
    tokens.push({ text: headingMatch[2], type: "heading" });
    return tokens;
  }

  // Blockquote
  if (line.startsWith("> ")) {
    tokens.push({ text: line, type: "blockquote" });
    return tokens;
  }

  // List items
  const listMatch = line.match(/^(\s*)([-*+]|\d+\.) (.*)$/);
  if (listMatch) {
    tokens.push({ text: listMatch[1] + listMatch[2] + " ", type: "list" });
    tokens.push({ text: listMatch[3], type: "text" });
    return tokens;
  }

  // Code block marker
  if (line.startsWith("```")) {
    tokens.push({ text: line, type: "code" });
    return tokens;
  }

  // Default: parse inline formatting
  if (line.length === 0) {
    tokens.push({ text: "", type: "text" });
    return tokens;
  }

  tokens.push({ text: line, type: "text" });
  return tokens;
}

function highlightScreenplayLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const indent = line.match(/^ */)?.[0].length || 0;
  const trimmed = line.trimStart();

  if (line.length === 0) {
    tokens.push({ text: "", type: "text" });
    return tokens;
  }

  // Scene heading (INT. / EXT.)
  if (/^(INT\.|EXT\.|INT\/EXT|I\/E)/i.test(trimmed)) {
    tokens.push({ text: line, type: "scene-heading" });
    return tokens;
  }

  // Transition (CUT TO:, FADE OUT, etc.)
  if (/^(CUT TO:|FADE OUT|FADE IN|DISSOLVE TO|SMASH CUT|MATCH CUT)/i.test(trimmed)) {
    tokens.push({ text: line, type: "transition" });
    return tokens;
  }

  // Character (indented 20+, all uppercase)
  if (indent >= 20 && trimmed === trimmed.toUpperCase() && trimmed.length > 0) {
    tokens.push({ text: line, type: "character" });
    return tokens;
  }

  // Parenthetical (indented 14+, starts with "(")
  if (indent >= 14 && trimmed.startsWith("(")) {
    tokens.push({ text: line, type: "parenthetical" });
    return tokens;
  }

  // Dialogue (indented 8+)
  if (indent >= 8) {
    tokens.push({ text: line, type: "dialogue" });
    return tokens;
  }

  // Action (default)
  tokens.push({ text: line, type: "action" });
  return tokens;
}
