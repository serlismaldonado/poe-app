import { EditorState } from "../state";
import { IRenderer } from "./types";
import { highlightLine, TokenType } from "../lib/highlight";

export class DOMRenderer implements IRenderer {
  private editorEl: HTMLElement | null = null;
  private positionEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private modeEl: HTMLElement | null = null;
  private statsEl: HTMLElement | null = null;

  constructor() {
    this.editorEl = document.getElementById("editor");
    this.positionEl = document.getElementById("position");
    this.statusEl = document.getElementById("status");
    this.modeEl = document.getElementById("mode");
    this.statsEl = document.getElementById("stats");
  }

  render(state: EditorState): void {
    if (!this.editorEl) return;

    const mode = state.cfg.mode || "markdown";
    const html = this.renderLines(state);
    this.editorEl.innerHTML = `<div class="content mode-${mode}">${html}</div>`;
    this.updatePosition(state);
    this.updateStatus(state);
    this.scrollToVisibleCursor(state);
  }

  setSize(width: number, height: number): void {
    if (this.editorEl) {
      this.editorEl.style.width = `${width}px`;
      this.editorEl.style.height = `${height}px`;
    }
  }

  clear(): void {
    if (this.editorEl) {
      this.editorEl.innerHTML = "";
    }
  }

  private renderLines(state: EditorState): string {
    const mode = (state.cfg.mode || "markdown") as "markdown" | "screenplay";
    
    return state.lines
      .map((line, lineNum) => {
        const isCurrentLine = lineNum === state.cursorLine;
        const elementType = mode === "screenplay" ? this.getLineElementType(line) : "";
        const lineClass = `line${isCurrentLine ? " active" : ""}${elementType ? " " + elementType : ""}`;
        const content = this.renderLine(line, lineNum, state, mode);
        return `<div class="${lineClass}" data-line="${lineNum}">${content}</div>`;
      })
      .join("");
  }

  private getLineElementType(line: string): string {
    const ind = line.match(/^ */)?.[0].length || 0;
    const trimmed = line.trimStart();

    if (ind === 0 && /^(INT\.|EXT\.|INT\/EXT|I\/E)/i.test(trimmed)) {
      return "line-scene";
    }
    if (ind === 0 && /^(CUT TO:|FADE OUT|FADE IN|DISSOLVE TO|SMASH CUT)/i.test(trimmed)) {
      return "line-transition";
    }
    if (ind >= 20) return "line-character";
    if (ind >= 14) return "line-parenthetical";
    if (ind >= 8) return "line-dialogue";
    return "line-action";
  }

  private renderLine(
    line: string,
    lineNum: number,
    state: EditorState,
    mode: "markdown" | "screenplay"
  ): string {
    const tokens = highlightLine(line, mode);
    let html = "";
    let charOffset = 0;
    const isCurrentLine = lineNum === state.cursorLine;

    // Calcular indentación para screenplay
    const lineIndent = line.match(/^ */)?.[0].length || 0;
    
    for (const token of tokens) {
      for (let i = 0; i < token.text.length; i++) {
        const char = token.text[i];
        const col = charOffset + i;
        const isCursor = isCurrentLine && col === state.cursorCol;
        const isSelected = this.isCharSelected(lineNum, col, state);
        const isSearchMatch = this.isSearchMatch(lineNum, col, state);

        let className = `char token-${token.type}`;
        if (isCursor) className += " cursor";
        if (isSelected) className += " selected";
        if (isSearchMatch) className += " search-match";
        
        // Marcar espacios de indentación en screenplay
        if (mode === "screenplay" && col < lineIndent && char === " ") {
          className += " indent-space";
        }

        // Focus mode: fade non-active lines (but not scene headings/characters in screenplay)
        if (!isCurrentLine && !state.selectionStart && mode === "screenplay") {
          if (token.type !== "scene-heading" && token.type !== "character") {
            className += " faded";
          }
        } else if (!isCurrentLine && !state.selectionStart && mode === "markdown") {
          className += " faded";
        }

        html += `<span class="${className}">${this.escapeChar(char)}</span>`;
      }
      charOffset += token.text.length;
    }

    // Cursor at end of line
    if (isCurrentLine && state.cursorCol === line.length) {
      html += '<span class="char cursor">&nbsp;</span>';
    }

    if (!html) {
      html = "&nbsp;";
    }

    return html;
  }

  private escapeChar(char: string): string {
    switch (char) {
      case " ":
        return "&nbsp;";
      case "\t":
        return "&nbsp;&nbsp;&nbsp;&nbsp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      default:
        return char;
    }
  }

  private isCharSelected(
    lineNum: number,
    col: number,
    state: EditorState
  ): boolean {
    if (!state.selectionStart || !state.selectionEnd) return false;

    const start = state.selectionStart;
    const end = state.selectionEnd;

    const startLine = Math.min(start.line, end.line);
    const endLine = Math.max(start.line, end.line);
    const startCol =
      start.line < end.line ? start.col : Math.min(start.col, end.col);
    const endCol =
      start.line < end.line ? end.col : Math.max(start.col, end.col);

    if (lineNum < startLine || lineNum > endLine) return false;
    if (lineNum === startLine && lineNum === endLine) {
      return col >= startCol && col < endCol;
    }
    if (lineNum === startLine) return col >= startCol;
    if (lineNum === endLine) return col < endCol;
    return true;
  }

  private isSearchMatch(
    lineNum: number,
    col: number,
    state: EditorState
  ): boolean {
    if (!state.searchMode || !state.searchQuery) return false;

    for (const match of state.searchMatches) {
      if (
        match.line === lineNum &&
        col >= match.col &&
        col < match.col + (match.length || state.searchQuery.length)
      ) {
        return true;
      }
    }
    return false;
  }

  private updatePosition(state: EditorState): void {
    if (this.positionEl) {
      const line = state.cursorLine + 1;
      const col = state.cursorCol + 1;
      this.positionEl.textContent = `${line}:${col}`;
    }

    if (this.statsEl) {
      const lines = state.lines.length;
      const words = state.lines.join(" ").split(/\s+/).filter(Boolean).length;
      this.statsEl.textContent = `${lines}L ${words}W`;
    }
  }

  private updateStatus(state: EditorState): void {
    const mode = state.cfg.mode || "markdown";

    if (this.modeEl) {
      if (mode === "screenplay") {
        const element = this.getScreenplayElement(state);
        this.modeEl.textContent = element;
        this.modeEl.className = "status-item screenplay-element";
      } else {
        this.modeEl.textContent = mode.toUpperCase();
        this.modeEl.className = "status-item";
      }
    }

    if (this.statusEl) {
      if (state.isSaving) {
        this.statusEl.textContent = "Saving...";
      }
    }
  }

  private getScreenplayElement(state: EditorState): string {
    const ln = state.lines[state.cursorLine] || "";
    const ind = ln.match(/^ */)?.[0].length || 0;
    const trimmed = ln.trimStart();

    if (ind === 0 && /^(INT\.|EXT\.|INT\/EXT|I\/E)/i.test(trimmed)) {
      return "ESCENA";
    }
    if (ind === 0 && /^(CUT TO:|FADE OUT|FADE IN|DISSOLVE TO|SMASH CUT)/i.test(trimmed)) {
      return "TRANSICIÓN";
    }
    if (ind >= 20) return "PERSONAJE";
    if (ind >= 14) return "PARÉNTESIS";
    if (ind >= 8) return "DIÁLOGO";
    return "ACCIÓN";
  }

  private scrollToVisibleCursor(state: EditorState): void {
    if (!this.editorEl) return;

    const content = this.editorEl.querySelector(".content");
    if (!content) return;

    const lines = content.querySelectorAll(".line");
    if (lines[state.cursorLine]) {
      const line = lines[state.cursorLine] as HTMLElement;
      line.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }
}
