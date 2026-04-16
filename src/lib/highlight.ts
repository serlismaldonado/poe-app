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
  | "transition"
  | "marker";

export interface HighlightToken {
  text: string;
  type: TokenType;
  hidden?: boolean; // Ocultar en líneas no activas
}

export function highlightLine(
  line: string,
  mode: "markdown" | "screenplay" | "novel",
  isCurrentLine: boolean = true
): HighlightToken[] {
  if (mode === "screenplay") {
    return highlightScreenplayLine(line);
  }
  if (mode === "novel") {
    return highlightNovelLine(line, isCurrentLine);
  }
  return highlightMarkdownLine(line, isCurrentLine);
}

function highlightMarkdownLine(line: string, isCurrentLine: boolean): HighlightToken[] {
  const tokens: HighlightToken[] = [];

  // Headings - ocultar # en líneas no activas
  const headingMatch = line.match(/^(#{1,6}) (.*)$/);
  if (headingMatch) {
    tokens.push({ 
      text: headingMatch[1] + " ", 
      type: "marker",
      hidden: !isCurrentLine 
    });
    tokens.push({ text: headingMatch[2], type: "heading" });
    return tokens;
  }

  // Blockquote
  if (line.startsWith("> ")) {
    tokens.push({ text: "> ", type: "marker", hidden: !isCurrentLine });
    tokens.push({ text: line.slice(2), type: "blockquote" });
    return tokens;
  }

  // List items - ocultar bullet en líneas no activas
  const listMatch = line.match(/^(\s*)([-*+]) (.*)$/);
  if (listMatch) {
    if (listMatch[1]) {
      tokens.push({ text: listMatch[1], type: "text" });
    }
    tokens.push({ text: listMatch[2] + " ", type: "list", hidden: !isCurrentLine });
    tokens.push({ text: listMatch[3], type: "text" });
    return parseInlineFormatting(tokens, isCurrentLine);
  }

  // Numbered list
  const numMatch = line.match(/^(\s*)(\d+\.) (.*)$/);
  if (numMatch) {
    if (numMatch[1]) {
      tokens.push({ text: numMatch[1], type: "text" });
    }
    tokens.push({ text: numMatch[2] + " ", type: "list" });
    tokens.push({ text: numMatch[3], type: "text" });
    return parseInlineFormatting(tokens, isCurrentLine);
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
  return parseInlineFormatting(tokens, isCurrentLine);
}

function parseInlineFormatting(tokens: HighlightToken[], isCurrentLine: boolean): HighlightToken[] {
  const result: HighlightToken[] = [];
  
  for (const token of tokens) {
    if (token.type !== "text" || token.hidden) {
      result.push(token);
      continue;
    }
    
    const text = token.text;
    let i = 0;
    let currentText = "";
    
    while (i < text.length) {
      // Bold **text**
      if (text[i] === "*" && text[i + 1] === "*") {
        if (currentText) {
          result.push(...parseUrls(currentText));
          currentText = "";
        }
        
        const endIdx = text.indexOf("**", i + 2);
        if (endIdx !== -1) {
          result.push({ text: "**", type: "marker", hidden: !isCurrentLine });
          result.push({ text: text.slice(i + 2, endIdx), type: "bold" });
          result.push({ text: "**", type: "marker", hidden: !isCurrentLine });
          i = endIdx + 2;
          continue;
        }
      }
      
      // Italic *text*
      if (text[i] === "*" && text[i + 1] !== "*" && (i === 0 || text[i - 1] !== "*")) {
        if (currentText) {
          result.push(...parseUrls(currentText));
          currentText = "";
        }
        
        let endIdx = -1;
        for (let j = i + 1; j < text.length; j++) {
          if (text[j] === "*" && text[j - 1] !== "*" && text[j + 1] !== "*") {
            endIdx = j;
            break;
          }
        }
        
        if (endIdx !== -1) {
          result.push({ text: "*", type: "marker", hidden: !isCurrentLine });
          result.push({ text: text.slice(i + 1, endIdx), type: "italic" });
          result.push({ text: "*", type: "marker", hidden: !isCurrentLine });
          i = endIdx + 1;
          continue;
        }
      }
      
      // Inline code `text`
      if (text[i] === "`") {
        if (currentText) {
          result.push(...parseUrls(currentText));
          currentText = "";
        }
        
        const endIdx = text.indexOf("`", i + 1);
        if (endIdx !== -1) {
          result.push({ text: "`", type: "marker", hidden: !isCurrentLine });
          result.push({ text: text.slice(i + 1, endIdx), type: "code" });
          result.push({ text: "`", type: "marker", hidden: !isCurrentLine });
          i = endIdx + 1;
          continue;
        }
      }
      
      currentText += text[i];
      i++;
    }
    
    if (currentText) {
      result.push(...parseUrls(currentText));
    }
  }
  
  return result;
}

function parseUrls(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|org|net|io|dev|co|me|app|xyz|info|biz|edu|gov)[^\s]*|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), type: "text" });
    }
    tokens.push({ text: match[1], type: "link" });
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), type: "text" });
  }

  if (tokens.length === 0) {
    tokens.push({ text, type: "text" });
  }

  return tokens;
}

function highlightNovelLine(line: string, isCurrentLine: boolean): HighlightToken[] {
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

  // Default prose - parse inline formatting
  if (line.length === 0) {
    tokens.push({ text: "", type: "text" });
    return tokens;
  }

  tokens.push({ text: line, type: "text" });
  return parseInlineFormatting(tokens, isCurrentLine);
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
