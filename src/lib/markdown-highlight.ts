export interface HighlightToken {
  text: string;
  type:
    | "text"
    | "heading"
    | "bold"
    | "italic"
    | "code"
    | "link"
    | "list"
    | "blockquote";
}

export function highlightMarkdownLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];

  // Headings
  const headingMatch = line.match(/^(#{1,6}) (.*)$/);
  if (headingMatch) {
    tokens.push({
      text: headingMatch[1],
      type: "heading",
    });
    tokens.push({
      text: " ",
      type: "text",
    });
    tokens.push({
      text: headingMatch[2],
      type: "heading",
    });
    return tokens;
  }

  // Blockquote
  if (line.startsWith("> ")) {
    tokens.push({
      text: "> ",
      type: "blockquote",
    });
    tokens.push({
      text: line.slice(2),
      type: "blockquote",
    });
    return tokens;
  }

  // List items
  const listMatch = line.match(/^(\s*)([-*+]) (.*)$/);
  if (listMatch) {
    tokens.push({
      text: listMatch[1] + listMatch[2] + " ",
      type: "list",
    });
    tokens.push({
      text: listMatch[3],
      type: "text",
    });
    return tokens;
  }

  // Code blocks
  if (line.startsWith("```")) {
    tokens.push({
      text: line,
      type: "code",
    });
    return tokens;
  }

  // Inline code
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, match.index),
        type: "text",
      });
    }
    tokens.push({
      text: match[0],
      type: "code",
    });
    lastIndex = codeRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    let remaining = line.slice(lastIndex);

    // Bold and italic
    remaining = remaining
      .replace(/\*\*([^\*]+)\*\*/g, (match, text) => {
        tokens.push({
          text: "**",
          type: "text",
        });
        tokens.push({
          text,
          type: "bold",
        });
        tokens.push({
          text: "**",
          type: "text",
        });
        return "";
      })
      .replace(/\*([^\*]+)\*/g, (match, text) => {
        tokens.push({
          text: "*",
          type: "text",
        });
        tokens.push({
          text,
          type: "italic",
        });
        tokens.push({
          text: "*",
          type: "text",
        });
        return "";
      });

    if (remaining) {
      tokens.push({
        text: remaining,
        type: "text",
      });
    }
  }

  if (tokens.length === 0) {
    tokens.push({
      text: line,
      type: "text",
    });
  }

  return tokens;
}
